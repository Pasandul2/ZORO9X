/**
 * Quotation Controller
 * Handles all quotation management operations
 */

const { pool } = require('../config/database');

/**
 * Generate unique quotation number
 */
const generateQuotationNumber = async () => {
  const year = new Date().getFullYear();
  const [result] = await pool.query(
    'SELECT COUNT(*) as count FROM quotations WHERE quotation_number LIKE ?',
    [`QT-${year}%`]
  );
  const count = result[0].count + 1;
  return `QT-${year}${count.toString().padStart(4, '0')}`;
};

/**
 * Get all quotations
 */
const getAllQuotations = async (req, res) => {
  try {
    const { status, client_id, search } = req.query;
    
    let query = `
      SELECT q.*, c.client_name, c.company_name, c.email as client_email
      FROM quotations q
      LEFT JOIN clients c ON q.client_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND q.status = ?';
      params.push(status);
    }

    if (client_id) {
      query += ' AND q.client_id = ?';
      params.push(client_id);
    }

    if (search) {
      query += ' AND (q.quotation_number LIKE ? OR c.client_name LIKE ? OR c.company_name LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    query += ' ORDER BY q.created_at DESC';

    const [quotations] = await pool.query(query, params);

    res.json({
      success: true,
      data: quotations
    });
  } catch (error) {
    console.error('Error fetching quotations:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching quotations',
      error: error.message
    });
  }
};

/**
 * Get a single quotation by ID
 */
const getQuotationById = async (req, res) => {
  try {
    const { id } = req.params;

    const [quotations] = await pool.query(
      `SELECT q.*, c.client_name, c.company_name, c.email as client_email, c.phone, c.address
       FROM quotations q
       LEFT JOIN clients c ON q.client_id = c.id
       WHERE q.id = ?`,
      [id]
    );

    if (quotations.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found'
      });
    }

    res.json({
      success: true,
      data: quotations[0]
    });
  } catch (error) {
    console.error('Error fetching quotation:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching quotation',
      error: error.message
    });
  }
};

/**
 * Create a new quotation
 */
const createQuotation = async (req, res) => {
  try {
    const {
      client_id,
      quotation_date,
      valid_until,
      items,
      subtotal,
      discount,
      total_amount,
      payment_method,
      terms_conditions,
      notes,
      status
    } = req.body;

    // Validation
    if (!client_id || !quotation_date || !items || items.length === 0) {
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

    // Generate quotation number
    const quotation_number = await generateQuotationNumber();

    const [result] = await pool.query(
      `INSERT INTO quotations 
      (quotation_number, client_id, quotation_date, valid_until, items, subtotal, discount, total_amount, payment_method, terms_conditions, notes, status, created_by) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        quotation_number,
        client_id,
        quotation_date,
        valid_until || null,
        JSON.stringify(items),
        subtotal,
        discount || 0,
        total_amount,
        payment_method || null,
        terms_conditions || null,
        notes || null,
        status || 'draft',
        req.user?.id || null
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Quotation created successfully',
      data: {
        id: result.insertId,
        quotation_number
      }
    });
  } catch (error) {
    console.error('Error creating quotation:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating quotation',
      error: error.message
    });
  }
};

/**
 * Update a quotation
 */
const updateQuotation = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      client_id,
      quotation_date,
      valid_until,
      items,
      subtotal,
      discount,
      total_amount,
      payment_method,
      terms_conditions,
      notes,
      status
    } = req.body;

    // Check if quotation exists
    const [existingQuotation] = await pool.query(
      'SELECT id FROM quotations WHERE id = ?',
      [id]
    );

    if (existingQuotation.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found'
      });
    }

    await pool.query(
      `UPDATE quotations SET 
        client_id = COALESCE(?, client_id),
        quotation_date = COALESCE(?, quotation_date),
        valid_until = ?,
        items = COALESCE(?, items),
        subtotal = COALESCE(?, subtotal),
        discount = COALESCE(?, discount),
        total_amount = COALESCE(?, total_amount),
        payment_method = ?,
        terms_conditions = ?,
        notes = ?,
        status = COALESCE(?, status)
      WHERE id = ?`,
      [
        client_id,
        quotation_date,
        valid_until,
        items ? JSON.stringify(items) : null,
        subtotal,
        discount,
        total_amount,
        payment_method,
        terms_conditions,
        notes,
        status,
        id
      ]
    );

    res.json({
      success: true,
      message: 'Quotation updated successfully'
    });
  } catch (error) {
    console.error('Error updating quotation:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating quotation',
      error: error.message
    });
  }
};

/**
 * Delete a quotation
 */
const deleteQuotation = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if quotation exists
    const [existingQuotation] = await pool.query(
      'SELECT id FROM quotations WHERE id = ?',
      [id]
    );

    if (existingQuotation.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found'
      });
    }

    await pool.query('DELETE FROM quotations WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Quotation deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting quotation:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting quotation',
      error: error.message
    });
  }
};

/**
 * Get quotation statistics
 */
const getQuotationStats = async (req, res) => {
  try {
    const [stats] = await pool.query(`
      SELECT 
        COUNT(*) as total_quotations,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft_quotations,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent_quotations,
        SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as accepted_quotations,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_quotations,
        SUM(total_amount) as total_value
      FROM quotations
    `);

    res.json({
      success: true,
      data: stats[0]
    });
  } catch (error) {
    console.error('Error fetching quotation stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching quotation statistics',
      error: error.message
    });
  }
};

module.exports = {
  getAllQuotations,
  getQuotationById,
  createQuotation,
  updateQuotation,
  deleteQuotation,
  getQuotationStats
};
