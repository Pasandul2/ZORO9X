/**
 * Invoice Controller
 * Handles all invoice management operations
 */

const { pool } = require('../config/database');

/**
 * Generate unique invoice number
 */
const generateInvoiceNumber = async () => {
  const year = new Date().getFullYear();
  const [result] = await pool.query(
    'SELECT COUNT(*) as count FROM invoices WHERE invoice_number LIKE ?',
    [`INV-${year}%`]
  );
  const count = result[0].count + 1;
  return `INV-${year}${count.toString().padStart(4, '0')}`;
};

/**
 * Get all invoices
 */
const getAllInvoices = async (req, res) => {
  try {
    const { status, client_id, search } = req.query;
    
    let query = `
      SELECT i.*, c.client_name, c.company_name, c.email as client_email
      FROM invoices i
      LEFT JOIN clients c ON i.client_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND i.status = ?';
      params.push(status);
    }

    if (client_id) {
      query += ' AND i.client_id = ?';
      params.push(client_id);
    }

    if (search) {
      query += ' AND (i.invoice_number LIKE ? OR c.client_name LIKE ? OR c.company_name LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    query += ' ORDER BY i.created_at DESC';

    const [invoices] = await pool.query(query, params);

    res.json({
      success: true,
      data: invoices
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching invoices',
      error: error.message
    });
  }
};

/**
 * Get a single invoice by ID
 */
const getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;

    const [invoices] = await pool.query(
      `SELECT i.*, c.client_name, c.company_name, c.email as client_email, c.phone, c.address
       FROM invoices i
       LEFT JOIN clients c ON i.client_id = c.id
       WHERE i.id = ?`,
      [id]
    );

    if (invoices.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    res.json({
      success: true,
      data: invoices[0]
    });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching invoice',
      error: error.message
    });
  }
};

/**
 * Create a new invoice
 */
const createInvoice = async (req, res) => {
  try {
    const {
      client_id,
      invoice_date,
      due_date,
      items,
      subtotal,
      discount,
      tax,
      total_amount,
      paid_amount,
      payment_method,
      terms_conditions,
      notes,
      status,
      quotation_id
    } = req.body;

    // Validation
    if (!client_id || !invoice_date || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Client, date, and items are required'
      });
    }

    // Check if client exists
    const [client] = await pool.query(
      'SELECT id FROM clients WHERE id = ?',
      [client_id]
    );

    if (client.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    // Generate invoice number
    const invoice_number = await generateInvoiceNumber();

    const [result] = await pool.query(
      `INSERT INTO invoices 
      (invoice_number, client_id, invoice_date, due_date, items, subtotal, discount, tax, total_amount, paid_amount, payment_method, terms_conditions, notes, status, quotation_id, created_by) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        invoice_number,
        client_id,
        invoice_date,
        due_date || null,
        JSON.stringify(items),
        subtotal,
        discount || 0,
        tax || 0,
        total_amount,
        paid_amount || 0,
        payment_method || null,
        terms_conditions || null,
        notes || null,
        status || 'draft',
        quotation_id || null,
        req.user?.id || null
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      data: {
        id: result.insertId,
        invoice_number
      }
    });
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating invoice',
      error: error.message
    });
  }
};

/**
 * Update an invoice
 */
const updateInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      client_id,
      invoice_date,
      due_date,
      items,
      subtotal,
      discount,
      tax,
      total_amount,
      paid_amount,
      payment_method,
      terms_conditions,
      notes,
      status
    } = req.body;

    // Check if invoice exists
    const [existingInvoice] = await pool.query(
      'SELECT id FROM invoices WHERE id = ?',
      [id]
    );

    if (existingInvoice.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    await pool.query(
      `UPDATE invoices SET 
        client_id = COALESCE(?, client_id),
        invoice_date = COALESCE(?, invoice_date),
        due_date = ?,
        items = COALESCE(?, items),
        subtotal = COALESCE(?, subtotal),
        discount = COALESCE(?, discount),
        tax = COALESCE(?, tax),
        total_amount = COALESCE(?, total_amount),
        paid_amount = COALESCE(?, paid_amount),
        payment_method = ?,
        terms_conditions = ?,
        notes = ?,
        status = COALESCE(?, status)
      WHERE id = ?`,
      [
        client_id,
        invoice_date,
        due_date,
        items ? JSON.stringify(items) : null,
        subtotal,
        discount,
        tax,
        total_amount,
        paid_amount,
        payment_method,
        terms_conditions,
        notes,
        status,
        id
      ]
    );

    res.json({
      success: true,
      message: 'Invoice updated successfully'
    });
  } catch (error) {
    console.error('Error updating invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating invoice',
      error: error.message
    });
  }
};

/**
 * Delete an invoice
 */
const deleteInvoice = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if invoice exists
    const [existingInvoice] = await pool.query(
      'SELECT id FROM invoices WHERE id = ?',
      [id]
    );

    if (existingInvoice.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    await pool.query('DELETE FROM invoices WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Invoice deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting invoice',
      error: error.message
    });
  }
};

/**
 * Record payment for an invoice
 */
const recordPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, payment_method } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid payment amount is required'
      });
    }

    // Get current invoice
    const [invoices] = await pool.query(
      'SELECT * FROM invoices WHERE id = ?',
      [id]
    );

    if (invoices.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    const invoice = invoices[0];
    const newPaidAmount = parseFloat(invoice.paid_amount) + parseFloat(amount);
    const totalAmount = parseFloat(invoice.total_amount);

    let newStatus = invoice.status;
    if (newPaidAmount >= totalAmount) {
      newStatus = 'paid';
    } else if (newPaidAmount > 0) {
      newStatus = 'partial';
    }

    await pool.query(
      `UPDATE invoices SET 
        paid_amount = ?,
        status = ?,
        payment_method = COALESCE(?, payment_method)
      WHERE id = ?`,
      [newPaidAmount, newStatus, payment_method, id]
    );

    res.json({
      success: true,
      message: 'Payment recorded successfully',
      data: {
        paid_amount: newPaidAmount,
        status: newStatus
      }
    });
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({
      success: false,
      message: 'Error recording payment',
      error: error.message
    });
  }
};

/**
 * Get invoice statistics
 */
const getInvoiceStats = async (req, res) => {
  try {
    const [stats] = await pool.query(`
      SELECT 
        COUNT(*) as total_invoices,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft_invoices,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent_invoices,
        SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_invoices,
        SUM(CASE WHEN status = 'partial' THEN 1 ELSE 0 END) as partial_invoices,
        SUM(CASE WHEN status = 'overdue' THEN 1 ELSE 0 END) as overdue_invoices,
        SUM(total_amount) as total_value,
        SUM(paid_amount) as total_paid,
        SUM(total_amount - paid_amount) as total_outstanding
      FROM invoices
    `);

    res.json({
      success: true,
      data: stats[0]
    });
  } catch (error) {
    console.error('Error fetching invoice stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching invoice statistics',
      error: error.message
    });
  }
};

module.exports = {
  getAllInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  recordPayment,
  getInvoiceStats
};
