/**
 * Invoice Controller
 * 
 * Manages invoicing and billing
 */

const { pool } = require('../config/database');
const { createStripeInvoice } = require('../services/stripeService');
const { sendEmail } = require('../services/emailService');
const { logAudit } = require('../services/auditService');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Create invoice
 */
exports.createInvoice = async (req, res) => {
  try {
    const {
      clientId,
      subscriptionId,
      items,
      tax = 0,
      notes
    } = req.body;
    
    const connection = await pool.getConnection();
    
    // Get client info
    const [clients] = await connection.execute(
      'SELECT * FROM clients WHERE id = ?',
      [clientId]
    );
    
    if (clients.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Client not found' });
    }
    
    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const taxAmount = (subtotal * tax) / 100;
    const total = subtotal + taxAmount;
    
    // Create invoice
    const invoiceNumber = `INV-${Date.now()}`;
    
    const [result] = await connection.execute(
      `INSERT INTO invoices 
       (invoice_number, client_id, subscription_id, subtotal, tax, total, notes, status, due_date) 
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', DATE_ADD(NOW(), INTERVAL 7 DAY))`,
      [invoiceNumber, clientId, subscriptionId, subtotal, taxAmount, total, notes || null]
    );
    
    const invoiceId = result.insertId;
    
    // Create invoice items
    for (const item of items) {
      await connection.execute(
        `INSERT INTO invoice_items 
         (invoice_id, description, quantity, unit_price, total) 
         VALUES (?, ?, ?, ?, ?)`,
        [invoiceId, item.description, item.quantity, item.unitPrice, item.quantity * item.unitPrice]
      );
    }
    
    connection.release();
    
    // Generate PDF
    const pdfPath = await generateInvoicePDF(invoiceId);
    
    // Send email
    await sendInvoiceEmail(clients[0].company_email, invoiceNumber, pdfPath);
    
    await logAudit({
      userId: req.admin?.id || clientId,
      userType: req.admin ? 'admin' : 'client',
      action: 'CREATE_INVOICE',
      resourceType: 'invoice',
      resourceId: invoiceId,
      newValue: { invoiceNumber, total },
      ipAddress: req.ip
    });
    
    res.json({
      message: 'Invoice created successfully',
      invoiceId,
      invoiceNumber,
      pdfPath
    });
    
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
};

/**
 * Get all invoices
 */
exports.getAllInvoices = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    const [invoices] = await connection.execute(
      `SELECT 
        i.*,
        c.company_name,
        c.company_email
       FROM invoices i
       JOIN clients c ON i.client_id = c.id
       ORDER BY i.created_at DESC`
    );
    
    connection.release();
    
    res.json(invoices);
    
  } catch (error) {
    console.error('Error getting invoices:', error);
    res.status(500).json({ error: 'Failed to get invoices' });
  }
};

/**
 * Get client invoices
 */
exports.getClientInvoices = async (req, res) => {
  try {
    const clientId = req.user.id;
    
    const connection = await pool.getConnection();
    
    const [invoices] = await connection.execute(
      'SELECT * FROM invoices WHERE client_id = ? ORDER BY created_at DESC',
      [clientId]
    );
    
    connection.release();
    
    res.json(invoices);
    
  } catch (error) {
    console.error('Error getting client invoices:', error);
    res.status(500).json({ error: 'Failed to get invoices' });
  }
};

/**
 * Get invoice details
 */
exports.getInvoiceDetails = async (req, res) => {
  try {
    const { id } = req.params;
    
    const connection = await pool.getConnection();
    
    // Get invoice
    const [invoices] = await connection.execute(
      `SELECT 
        i.*,
        c.company_name,
        c.company_email,
        c.company_address,
        c.company_phone
       FROM invoices i
       JOIN clients c ON i.client_id = c.id
       WHERE i.id = ?`,
      [id]
    );
    
    if (invoices.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    // Get invoice items
    const [items] = await connection.execute(
      'SELECT * FROM invoice_items WHERE invoice_id = ?',
      [id]
    );
    
    connection.release();
    
    res.json({
      ...invoices[0],
      items
    });
    
  } catch (error) {
    console.error('Error getting invoice details:', error);
    res.status(500).json({ error: 'Failed to get invoice details' });
  }
};

/**
 * Update invoice status
 */
exports.updateInvoiceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, paymentMethod, transactionId } = req.body;
    
    const connection = await pool.getConnection();
    
    await connection.execute(
      'UPDATE invoices SET status = ?, payment_method = ?, transaction_id = ?, paid_at = ? WHERE id = ?',
      [status, paymentMethod || null, transactionId || null, status === 'paid' ? new Date() : null, id]
    );
    
    // Get invoice details for email
    const [invoices] = await connection.execute(
      `SELECT i.*, c.company_email FROM invoices i
       JOIN clients c ON i.client_id = c.id
       WHERE i.id = ?`,
      [id]
    );
    
    connection.release();
    
    // Send payment confirmation email
    if (status === 'paid' && invoices.length > 0) {
      await sendEmail({
        to: invoices[0].company_email,
        subject: `Payment Confirmed - Invoice ${invoices[0].invoice_number}`,
        html: `
          <h2>Payment Confirmed</h2>
          <p>Your payment for invoice <strong>${invoices[0].invoice_number}</strong> has been received.</p>
          <p>Amount: $${invoices[0].total}</p>
          <p>Transaction ID: ${transactionId}</p>
          <p>Thank you for your business!</p>
        `
      });
    }
    
    await logAudit({
      userId: req.admin?.id || req.user?.id,
      userType: req.admin ? 'admin' : 'client',
      action: 'UPDATE_INVOICE_STATUS',
      resourceType: 'invoice',
      resourceId: id,
      newValue: { status },
      ipAddress: req.ip
    });
    
    res.json({ message: 'Invoice status updated successfully' });
    
  } catch (error) {
    console.error('Error updating invoice status:', error);
    res.status(500).json({ error: 'Failed to update invoice status' });
  }
};

/**
 * Generate invoice PDF
 */
async function generateInvoicePDF(invoiceId) {
  try {
    const connection = await pool.getConnection();
    
    // Get invoice details
    const [invoices] = await connection.execute(
      `SELECT 
        i.*,
        c.company_name,
        c.company_email,
        c.company_address,
        c.company_phone
       FROM invoices i
       JOIN clients c ON i.client_id = c.id
       WHERE i.id = ?`,
      [invoiceId]
    );
    
    if (invoices.length === 0) {
      connection.release();
      throw new Error('Invoice not found');
    }
    
    const invoice = invoices[0];
    
    // Get invoice items
    const [items] = await connection.execute(
      'SELECT * FROM invoice_items WHERE invoice_id = ?',
      [invoiceId]
    );
    
    connection.release();
    
    // Create PDF
    const doc = new PDFDocument();
    const invoicesDir = path.join(__dirname, '..', 'invoices');
    
    // Create invoices directory if it doesn't exist
    if (!fs.existsSync(invoicesDir)) {
      fs.mkdirSync(invoicesDir, { recursive: true });
    }
    
    const filename = `${invoice.invoice_number}.pdf`;
    const filepath = path.join(invoicesDir, filename);
    
    doc.pipe(fs.createWriteStream(filepath));
    
    // Header
    doc.fontSize(20).text('INVOICE', 50, 50);
    doc.fontSize(10).text(`Invoice Number: ${invoice.invoice_number}`, 50, 80);
    doc.text(`Date: ${new Date(invoice.created_at).toLocaleDateString()}`, 50, 95);
    doc.text(`Due Date: ${new Date(invoice.due_date).toLocaleDateString()}`, 50, 110);
    
    // Client info
    doc.fontSize(12).text('Bill To:', 50, 150);
    doc.fontSize(10).text(invoice.company_name, 50, 170);
    doc.text(invoice.company_email, 50, 185);
    if (invoice.company_address) doc.text(invoice.company_address, 50, 200);
    if (invoice.company_phone) doc.text(invoice.company_phone, 50, 215);
    
    // Items table
    let yPos = 270;
    doc.fontSize(10).text('Description', 50, yPos);
    doc.text('Quantity', 300, yPos);
    doc.text('Unit Price', 380, yPos);
    doc.text('Total', 480, yPos);
    
    yPos += 20;
    doc.moveTo(50, yPos).lineTo(550, yPos).stroke();
    yPos += 10;
    
    items.forEach(item => {
      doc.text(item.description, 50, yPos);
      doc.text(item.quantity.toString(), 300, yPos);
      doc.text(`$${item.unit_price.toFixed(2)}`, 380, yPos);
      doc.text(`$${item.total.toFixed(2)}`, 480, yPos);
      yPos += 25;
    });
    
    // Totals
    yPos += 20;
    doc.moveTo(50, yPos).lineTo(550, yPos).stroke();
    yPos += 15;
    
    doc.text('Subtotal:', 380, yPos);
    doc.text(`$${invoice.subtotal.toFixed(2)}`, 480, yPos);
    yPos += 20;
    
    doc.text('Tax:', 380, yPos);
    doc.text(`$${invoice.tax.toFixed(2)}`, 480, yPos);
    yPos += 20;
    
    doc.fontSize(12).text('Total:', 380, yPos);
    doc.text(`$${invoice.total.toFixed(2)}`, 480, yPos);
    
    // Notes
    if (invoice.notes) {
      yPos += 40;
      doc.fontSize(10).text('Notes:', 50, yPos);
      doc.text(invoice.notes, 50, yPos + 15, { width: 500 });
    }
    
    // Footer
    doc.fontSize(8).text('Thank you for your business!', 50, 700, { align: 'center', width: 500 });
    
    doc.end();
    
    return filepath;
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}

/**
 * Send invoice email
 */
async function sendInvoiceEmail(email, invoiceNumber, pdfPath) {
  try {
    await sendEmail({
      to: email,
      subject: `New Invoice - ${invoiceNumber}`,
      html: `
        <h2>New Invoice</h2>
        <p>Please find your invoice <strong>${invoiceNumber}</strong> attached.</p>
        <p>Payment is due within 7 days.</p>
        <p>Thank you for your business!</p>
      `,
      attachments: [
        {
          filename: path.basename(pdfPath),
          path: pdfPath
        }
      ]
    });
  } catch (error) {
    console.error('Error sending invoice email:', error);
  }
}

/**
 * Download invoice PDF
 */
exports.downloadInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    
    const connection = await pool.getConnection();
    
    const [invoices] = await connection.execute(
      'SELECT invoice_number FROM invoices WHERE id = ?',
      [id]
    );
    
    connection.release();
    
    if (invoices.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    const filename = `${invoices[0].invoice_number}.pdf`;
    const filepath = path.join(__dirname, '..', 'invoices', filename);
    
    if (!fs.existsSync(filepath)) {
      // Generate PDF if not exists
      await generateInvoicePDF(id);
    }
    
    res.download(filepath);
    
  } catch (error) {
    console.error('Error downloading invoice:', error);
    res.status(500).json({ error: 'Failed to download invoice' });
  }
};

/**
 * Send reminder for overdue invoices
 */
exports.sendOverdueReminders = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    // Get overdue invoices
    const [invoices] = await connection.execute(
      `SELECT 
        i.*,
        c.company_email
       FROM invoices i
       JOIN clients c ON i.client_id = c.id
       WHERE i.status = 'pending' AND i.due_date < CURDATE()`
    );
    
    connection.release();
    
    let sentCount = 0;
    
    for (const invoice of invoices) {
      await sendEmail({
        to: invoice.company_email,
        subject: `Payment Overdue - Invoice ${invoice.invoice_number}`,
        html: `
          <h2>Payment Overdue</h2>
          <p>This is a reminder that invoice <strong>${invoice.invoice_number}</strong> is overdue.</p>
          <p>Amount: $${invoice.total}</p>
          <p>Due Date: ${new Date(invoice.due_date).toLocaleDateString()}</p>
          <p>Please make payment at your earliest convenience.</p>
        `
      });
      sentCount++;
    }
    
    res.json({ 
      message: `Sent ${sentCount} overdue reminders`,
      count: sentCount 
    });
    
  } catch (error) {
    console.error('Error sending overdue reminders:', error);
    res.status(500).json({ error: 'Failed to send reminders' });
  }
};
