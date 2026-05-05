const { pool } = require('../config/database');

/**
 * Leads Controller
 * Handles CRUD for sales leads collected via admin panel
 */

const ALLOWED_STATUSES = new Set([
  'contact only',
  'interested',
  'confirmed',
  'declined',
  'rejected - call after 7 days',
  'callback scheduled'
]);

const ALLOWED_PRIORITIES = new Set(['low', 'medium', 'high']);

const normalizeStatus = (value) => {
  if (!value) return 'contact only';
  const v = String(value).trim().toLowerCase();
  return ALLOWED_STATUSES.has(v) ? v : 'contact only';
};

const normalizePriority = (value) => {
  if (!value) return 'medium';
  const v = String(value).trim().toLowerCase();
  return ALLOWED_PRIORITIES.has(v) ? v : 'medium';
};

const getAllLeads = async (req, res) => {
  try {
    // Support filters: search, status, hasImage, location, from, to, priority, followUp, starred
    const { search, status, hasImage, location, from, to, priority, followUp, starred } = req.query;
    let query = 'SELECT * FROM leads WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND status = ?';
      params.push(normalizeStatus(status));
    }

    if (priority) {
      query += ' AND priority = ?';
      params.push(normalizePriority(priority));
    }

    if (starred === '1' || starred === 'true') {
      query += ' AND is_starred = TRUE';
    }

    if (search) {
      query += ' AND (shop_name LIKE ? OR contact_number LIKE ? OR notes LIKE ?)';
      const p = `%${search}%`;
      params.push(p, p, p);
    }

    if (location) {
      query += ' AND location LIKE ?';
      params.push(`%${location}%`);
    }

    if (hasImage === '1' || hasImage === 'true') {
      query += ' AND image IS NOT NULL AND image <> ""';
    } else if (hasImage === '0' || hasImage === 'false') {
      query += ' AND (image IS NULL OR image = "")';
    }

    if (from) {
      query += ' AND created_at >= ?';
      params.push(from);
    }

    if (to) {
      query += ' AND created_at <= ?';
      params.push(to);
    }

    if (followUp === 'today') {
      query += ' AND next_follow_up_date = CURDATE()';
    } else if (followUp === 'overdue') {
      query += ' AND next_follow_up_date IS NOT NULL AND next_follow_up_date < CURDATE()';
    } else if (followUp === 'week') {
      query += ' AND next_follow_up_date IS NOT NULL AND next_follow_up_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)';
    }

    query += ' ORDER BY created_at DESC';

    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ success: false, message: 'Error fetching leads', error: error.message });
  }
};

const getLeadById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT * FROM leads WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Lead not found' });
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Error fetching lead:', error);
    res.status(500).json({ success: false, message: 'Error fetching lead', error: error.message });
  }
};

const createLead = async (req, res) => {
  try {
    const {
      shop_name,
      location,
      country_code,
      contact_number,
      status,
      priority,
      notes,
      special_note,
      next_follow_up_date,
      contact_attempts,
      last_contact_at,
      is_starred
    } = req.body;
    let image = null;
    if (req.file) {
      // Save path relative to /uploads
      image = `/uploads/leads/${req.file.filename}`;
    }

    if (!shop_name || !contact_number) {
      return res.status(400).json({ success: false, message: 'shop_name and contact_number are required' });
    }

    const normalizedStatus = normalizeStatus(status);
    const normalizedPriority = normalizePriority(priority);
    const today = new Date().toISOString().slice(0, 10);
    const finalFollowUpDate = next_follow_up_date || today;
    const finalCountryCode = country_code || '+94';

    const [result] = await pool.query(
      `INSERT INTO leads (shop_name, location, country_code, contact_number, status, priority, notes, special_note, image, created_by, next_follow_up_date, contact_attempts, last_contact_at, is_starred) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        shop_name,
        location || null,
        finalCountryCode,
        contact_number || null,
        normalizedStatus,
        normalizedPriority,
        notes || null,
        special_note || null,
        image,
        req.user?.id || null,
        finalFollowUpDate,
        Number(contact_attempts || 0),
        last_contact_at || null,
        is_starred === 'true' || is_starred === true || is_starred === '1'
      ]
    );

    res.status(201).json({ success: true, message: 'Lead created', data: { id: result.insertId } });
  } catch (error) {
    console.error('Error creating lead:', error);
    res.status(500).json({ success: false, message: 'Error creating lead', error: error.message });
  }
};

const updateLead = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      shop_name,
      location,
      country_code,
      contact_number,
      status,
      priority,
      notes,
      special_note,
      next_follow_up_date,
      contact_attempts,
      last_contact_at,
      is_starred
    } = req.body;

    const [existing] = await pool.query('SELECT id FROM leads WHERE id = ?', [id]);
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'Lead not found' });

    let image = null;
    if (req.file) {
      image = `/uploads/leads/${req.file.filename}`;
    }

    const normalizedStatus = status ? normalizeStatus(status) : null;
    const normalizedPriority = priority ? normalizePriority(priority) : null;
    const computedFollowUpDate = next_follow_up_date;

    await pool.query(
      `UPDATE leads SET shop_name = COALESCE(?, shop_name), location = COALESCE(?, location), country_code = COALESCE(?, country_code), contact_number = COALESCE(?, contact_number), status = COALESCE(?, status), priority = COALESCE(?, priority), notes = COALESCE(?, notes), special_note = COALESCE(?, special_note), image = COALESCE(?, image), next_follow_up_date = COALESCE(?, next_follow_up_date), contact_attempts = COALESCE(?, contact_attempts), last_contact_at = COALESCE(?, last_contact_at), is_starred = COALESCE(?, is_starred) WHERE id = ?`,
      [
        shop_name,
        location,
        country_code,
        contact_number,
        normalizedStatus,
        normalizedPriority,
        notes,
        special_note,
        image,
        computedFollowUpDate,
        contact_attempts !== undefined ? Number(contact_attempts) : null,
        last_contact_at,
        is_starred !== undefined ? (is_starred === 'true' || is_starred === true || is_starred === '1') : null,
        id
      ]
    );

    res.json({ success: true, message: 'Lead updated' });
  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(500).json({ success: false, message: 'Error updating lead', error: error.message });
  }
};

const deleteLead = async (req, res) => {
  try {
    const { id } = req.params;
    const [existing] = await pool.query('SELECT id FROM leads WHERE id = ?', [id]);
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'Lead not found' });

    await pool.query('DELETE FROM leads WHERE id = ?', [id]);
    res.json({ success: true, message: 'Lead deleted' });
  } catch (error) {
    console.error('Error deleting lead:', error);
    res.status(500).json({ success: false, message: 'Error deleting lead', error: error.message });
  }
};

module.exports = { getAllLeads, getLeadById, createLead, updateLead, deleteLead };
