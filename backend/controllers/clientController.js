/**
 * Client Controller
 * Handles all client management operations
 */

const { pool } = require('../config/database');

/**
 * Get all clients
 */
const getAllClients = async (req, res) => {
  try {
    const { status, search } = req.query;
    
    let query = 'SELECT * FROM clients WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (search) {
      query += ' AND (client_name LIKE ? OR company_name LIKE ? OR email LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    query += ' ORDER BY created_at DESC';

    const [clients] = await pool.query(query, params);

    res.json({
      success: true,
      data: clients
    });
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching clients',
      error: error.message
    });
  }
};

/**
 * Get a single client by ID
 */
const getClientById = async (req, res) => {
  try {
    const { id } = req.params;

    const [clients] = await pool.query(
      'SELECT * FROM clients WHERE id = ?',
      [id]
    );

    if (clients.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    res.json({
      success: true,
      data: clients[0]
    });
  } catch (error) {
    console.error('Error fetching client:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching client',
      error: error.message
    });
  }
};

/**
 * Create a new client
 */
const createClient = async (req, res) => {
  try {
    const {
      client_name,
      company_name,
      email,
      phone,
      address,
      country,
      tax_id,
      website,
      contact_person,
      payment_terms,
      notes,
      status
    } = req.body;

    // Validation
    if (!client_name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Client name and email are required'
      });
    }

    // Check if email already exists
    const [existingClient] = await pool.query(
      'SELECT id FROM clients WHERE email = ?',
      [email]
    );

    if (existingClient.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'A client with this email already exists'
      });
    }

    const [result] = await pool.query(
      `INSERT INTO clients 
      (client_name, company_name, email, phone, address, country, tax_id, website, contact_person, payment_terms, notes, status, created_by) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        client_name,
        company_name || null,
        email,
        phone || null,
        address || null,
        country || null,
        tax_id || null,
        website || null,
        contact_person || null,
        payment_terms || 'Net 30',
        notes || null,
        status || 'active',
        req.user?.id || null
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Client created successfully',
      data: {
        id: result.insertId
      }
    });
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating client',
      error: error.message
    });
  }
};

/**
 * Update a client
 */
const updateClient = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      client_name,
      company_name,
      email,
      phone,
      address,
      country,
      tax_id,
      website,
      contact_person,
      payment_terms,
      notes,
      status
    } = req.body;

    // Check if client exists
    const [existingClient] = await pool.query(
      'SELECT id FROM clients WHERE id = ?',
      [id]
    );

    if (existingClient.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    // Check if email is being changed and if it's already taken
    if (email) {
      const [emailCheck] = await pool.query(
        'SELECT id FROM clients WHERE email = ? AND id != ?',
        [email, id]
      );

      if (emailCheck.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'A client with this email already exists'
        });
      }
    }

    await pool.query(
      `UPDATE clients SET 
        client_name = COALESCE(?, client_name),
        company_name = COALESCE(?, company_name),
        email = COALESCE(?, email),
        phone = COALESCE(?, phone),
        address = COALESCE(?, address),
        country = COALESCE(?, country),
        tax_id = COALESCE(?, tax_id),
        website = COALESCE(?, website),
        contact_person = COALESCE(?, contact_person),
        payment_terms = COALESCE(?, payment_terms),
        notes = COALESCE(?, notes),
        status = COALESCE(?, status)
      WHERE id = ?`,
      [
        client_name,
        company_name,
        email,
        phone,
        address,
        country,
        tax_id,
        website,
        contact_person,
        payment_terms,
        notes,
        status,
        id
      ]
    );

    res.json({
      success: true,
      message: 'Client updated successfully'
    });
  } catch (error) {
    console.error('Error updating client:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating client',
      error: error.message
    });
  }
};

/**
 * Delete a client
 */
const deleteClient = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if client exists
    const [existingClient] = await pool.query(
      'SELECT id FROM clients WHERE id = ?',
      [id]
    );

    if (existingClient.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    // Check if client has associated quotations or invoices
    const [quotations] = await pool.query(
      'SELECT COUNT(*) as count FROM quotations WHERE client_id = ?',
      [id]
    );

    const [invoices] = await pool.query(
      'SELECT COUNT(*) as count FROM invoices WHERE client_id = ?',
      [id]
    );

    if (quotations[0].count > 0 || invoices[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete client with associated quotations or invoices. Archive the client instead.'
      });
    }

    await pool.query('DELETE FROM clients WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Client deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting client',
      error: error.message
    });
  }
};

/**
 * Get client statistics
 */
const getClientStats = async (req, res) => {
  try {
    const [stats] = await pool.query(`
      SELECT 
        COUNT(*) as total_clients,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_clients,
        SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive_clients,
        SUM(CASE WHEN status = 'archived' THEN 1 ELSE 0 END) as archived_clients
      FROM clients
    `);

    res.json({
      success: true,
      data: stats[0]
    });
  } catch (error) {
    console.error('Error fetching client stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching client statistics',
      error: error.message
    });
  }
};

module.exports = {
  getAllClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  getClientStats
};
