/**
 * Audit Logging Service
 * 
 * Tracks all important actions in the system
 */

const { pool } = require('../config/database');

/**
 * Log action to audit log
 */
async function logAudit({
  userId,
  userType = 'client',
  action,
  resourceType,
  resourceId,
  oldValue = null,
  newValue = null,
  ipAddress = null,
  userAgent = null,
  status = 'success',
  errorMessage = null
}) {
  try {
    const connection = await pool.getConnection();
    
    await connection.execute(
      `INSERT INTO audit_logs 
       (user_id, user_type, action, resource_type, resource_id, old_value, new_value, 
        ip_address, user_agent, status, error_message) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        userType,
        action,
        resourceType,
        resourceId,
        oldValue ? JSON.stringify(oldValue) : null,
        newValue ? JSON.stringify(newValue) : null,
        ipAddress,
        userAgent,
        status,
        errorMessage
      ]
    );
    
    connection.release();
  } catch (error) {
    console.error('Error logging audit:', error);
    // Don't throw error - audit logging should not break main functionality
  }
}

/**
 * Get audit logs with filters
 */
async function getAuditLogs({
  userId = null,
  userType = null,
  action = null,
  resourceType = null,
  resourceId = null,
  startDate = null,
  endDate = null,
  status = null,
  limit = 100,
  offset = 0
}) {
  try {
    const connection = await pool.getConnection();
    
    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];
    
    if (userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    }
    
    if (userType) {
      query += ' AND user_type = ?';
      params.push(userType);
    }
    
    if (action) {
      query += ' AND action = ?';
      params.push(action);
    }
    
    if (resourceType) {
      query += ' AND resource_type = ?';
      params.push(resourceType);
    }
    
    if (resourceId) {
      query += ' AND resource_id = ?';
      params.push(resourceId);
    }
    
    if (startDate) {
      query += ' AND created_at >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ' AND created_at <= ?';
      params.push(endDate);
    }
    
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const [results] = await connection.execute(query, params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM audit_logs WHERE 1=1';
    const countParams = params.slice(0, -2); // Remove limit and offset
    
    if (userId) countQuery += ' AND user_id = ?';
    if (userType) countQuery += ' AND user_type = ?';
    if (action) countQuery += ' AND action = ?';
    if (resourceType) countQuery += ' AND resource_type = ?';
    if (resourceId) countQuery += ' AND resource_id = ?';
    if (startDate) countQuery += ' AND created_at >= ?';
    if (endDate) countQuery += ' AND created_at <= ?';
    if (status) countQuery += ' AND status = ?';
    
    const [countResult] = await connection.execute(countQuery, countParams);
    
    connection.release();
    
    return {
      logs: results,
      total: countResult[0].total,
      limit,
      offset
    };
  } catch (error) {
    console.error('Error getting audit logs:', error);
    throw error;
  }
}

/**
 * Get user activity summary
 */
async function getUserActivitySummary(userId, userType, days = 30) {
  try {
    const connection = await pool.getConnection();
    
    const [results] = await connection.execute(
      `SELECT 
        action,
        COUNT(*) as count,
        MAX(created_at) as last_action
       FROM audit_logs 
       WHERE user_id = ? AND user_type = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY action
       ORDER BY count DESC`,
      [userId, userType, days]
    );
    
    connection.release();
    
    return results;
  } catch (error) {
    console.error('Error getting user activity summary:', error);
    throw error;
  }
}

/**
 * Get resource history
 */
async function getResourceHistory(resourceType, resourceId) {
  try {
    const connection = await pool.getConnection();
    
    const [results] = await connection.execute(
      `SELECT * FROM audit_logs 
       WHERE resource_type = ? AND resource_id = ?
       ORDER BY created_at DESC`,
      [resourceType, resourceId]
    );
    
    connection.release();
    
    return results;
  } catch (error) {
    console.error('Error getting resource history:', error);
    throw error;
  }
}

/**
 * Clean old audit logs
 */
async function cleanOldLogs(daysToKeep = 365) {
  try {
    const connection = await pool.getConnection();
    
    const [result] = await connection.execute(
      'DELETE FROM audit_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
      [daysToKeep]
    );
    
    connection.release();
    
    return result.affectedRows;
  } catch (error) {
    console.error('Error cleaning old logs:', error);
    throw error;
  }
}

/**
 * Express middleware for automatic audit logging
 */
function auditMiddleware(action, resourceType) {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json;
    
    // Override json method to log after response
    res.json = function(data) {
      // Restore original json method
      res.json = originalJson;
      
      // Log audit
      const userId = req.user?.id || req.admin?.id || null;
      const userType = req.admin ? 'admin' : 'client';
      const resourceId = req.params.id || data?.id || null;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('user-agent');
      const status = res.statusCode >= 200 && res.statusCode < 300 ? 'success' : 'failure';
      
      logAudit({
        userId,
        userType,
        action,
        resourceType,
        resourceId,
        newValue: data,
        ipAddress,
        userAgent,
        status
      });
      
      // Send response
      return originalJson.call(this, data);
    };
    
    next();
  };
}

module.exports = {
  logAudit,
  getAuditLogs,
  getUserActivitySummary,
  getResourceHistory,
  cleanOldLogs,
  auditMiddleware
};
