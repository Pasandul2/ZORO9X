/**
 * Usage Metering Service
 * 
 * Tracks and calculates usage-based billing
 */

const { pool } = require('../config/database');

/**
 * Record usage
 */
async function recordUsage(clientId, systemId, metric, quantity, metadata = null) {
  try {
    const connection = await pool.getConnection();
    
    await connection.execute(
      `INSERT INTO usage_records (client_id, system_id, metric, quantity, metadata) 
       VALUES (?, ?, ?, ?, ?)`,
      [clientId, systemId, metric, quantity, metadata ? JSON.stringify(metadata) : null]
    );
    
    connection.release();
    
    // Check if usage limit exceeded
    await checkUsageLimit(clientId, systemId, metric);
    
  } catch (error) {
    console.error('Error recording usage:', error);
    throw error;
  }
}

/**
 * Get usage for period
 */
async function getUsage(clientId, systemId = null, startDate = null, endDate = null) {
  try {
    const connection = await pool.getConnection();
    
    let query = `
      SELECT 
        metric,
        SUM(quantity) as total_quantity,
        COUNT(*) as record_count,
        MIN(created_at) as first_usage,
        MAX(created_at) as last_usage
      FROM usage_records 
      WHERE client_id = ?
    `;
    const params = [clientId];
    
    if (systemId) {
      query += ' AND system_id = ?';
      params.push(systemId);
    }
    
    if (startDate) {
      query += ' AND created_at >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ' AND created_at <= ?';
      params.push(endDate);
    }
    
    query += ' GROUP BY metric';
    
    const [results] = await connection.execute(query, params);
    
    connection.release();
    
    return results;
  } catch (error) {
    console.error('Error getting usage:', error);
    throw error;
  }
}

/**
 * Calculate usage cost
 */
async function calculateUsageCost(clientId, systemId, startDate, endDate) {
  try {
    const connection = await pool.getConnection();
    
    // Get usage records
    const [usageRecords] = await connection.execute(
      `SELECT metric, SUM(quantity) as total_quantity 
       FROM usage_records 
       WHERE client_id = ? AND system_id = ? AND created_at BETWEEN ? AND ?
       GROUP BY metric`,
      [clientId, systemId, startDate, endDate]
    );
    
    // Get pricing from subscription plan
    const [subscription] = await connection.execute(
      `SELECT sp.pricing_details 
       FROM client_subscriptions cs
       JOIN subscription_plans sp ON cs.plan_id = sp.id
       WHERE cs.client_id = ? AND cs.system_id = ?`,
      [clientId, systemId]
    );
    
    connection.release();
    
    if (subscription.length === 0) {
      return { totalCost: 0, breakdown: [] };
    }
    
    const pricing = JSON.parse(subscription[0].pricing_details || '{}');
    const breakdown = [];
    let totalCost = 0;
    
    // Calculate cost for each metric
    usageRecords.forEach(record => {
      const metricPricing = pricing[record.metric];
      if (metricPricing) {
        const cost = record.total_quantity * metricPricing.price_per_unit;
        totalCost += cost;
        breakdown.push({
          metric: record.metric,
          quantity: record.total_quantity,
          pricePerUnit: metricPricing.price_per_unit,
          cost: cost
        });
      }
    });
    
    return { totalCost, breakdown };
  } catch (error) {
    console.error('Error calculating usage cost:', error);
    throw error;
  }
}

/**
 * Set usage limit
 */
async function setUsageLimit(clientId, systemId, metric, limitValue, resetPeriod = 'monthly') {
  try {
    const connection = await pool.getConnection();
    
    await connection.execute(
      `INSERT INTO usage_limits (client_id, system_id, metric, limit_value, reset_period, current_usage) 
       VALUES (?, ?, ?, ?, ?, 0)
       ON DUPLICATE KEY UPDATE 
       limit_value = ?, reset_period = ?`,
      [clientId, systemId, metric, limitValue, resetPeriod, limitValue, resetPeriod]
    );
    
    connection.release();
  } catch (error) {
    console.error('Error setting usage limit:', error);
    throw error;
  }
}

/**
 * Check usage limit
 */
async function checkUsageLimit(clientId, systemId, metric) {
  try {
    const connection = await pool.getConnection();
    
    // Get usage limit
    const [limits] = await connection.execute(
      `SELECT * FROM usage_limits 
       WHERE client_id = ? AND system_id = ? AND metric = ?`,
      [clientId, systemId, metric]
    );
    
    if (limits.length === 0) {
      connection.release();
      return { withinLimit: true };
    }
    
    const limit = limits[0];
    
    // Calculate current usage based on reset period
    let startDate;
    const now = new Date();
    
    switch (limit.reset_period) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'weekly':
        const day = now.getDay();
        startDate = new Date(now.getTime() - day * 24 * 60 * 60 * 1000);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'yearly':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = limit.last_reset_at || new Date(0);
    }
    
    // Get current usage
    const [usage] = await connection.execute(
      `SELECT SUM(quantity) as total 
       FROM usage_records 
       WHERE client_id = ? AND system_id = ? AND metric = ? AND created_at >= ?`,
      [clientId, systemId, metric, startDate]
    );
    
    const currentUsage = usage[0]?.total || 0;
    
    // Update current usage
    await connection.execute(
      'UPDATE usage_limits SET current_usage = ?, last_updated_at = NOW() WHERE id = ?',
      [currentUsage, limit.id]
    );
    
    connection.release();
    
    const withinLimit = currentUsage < limit.limit_value;
    const percentUsed = (currentUsage / limit.limit_value) * 100;
    
    // Send notification if approaching limit
    if (!withinLimit || percentUsed >= 80) {
      await notifyUsageLimit(clientId, systemId, metric, currentUsage, limit.limit_value, percentUsed);
    }
    
    return {
      withinLimit,
      currentUsage,
      limitValue: limit.limit_value,
      percentUsed: percentUsed.toFixed(2)
    };
    
  } catch (error) {
    console.error('Error checking usage limit:', error);
    throw error;
  }
}

/**
 * Reset usage counters
 */
async function resetUsageLimits() {
  try {
    const connection = await pool.getConnection();
    
    const now = new Date();
    
    // Reset daily limits
    await connection.execute(
      `UPDATE usage_limits 
       SET current_usage = 0, last_reset_at = NOW() 
       WHERE reset_period = 'daily' 
       AND (last_reset_at IS NULL OR DATE(last_reset_at) < CURDATE())`
    );
    
    // Reset weekly limits
    await connection.execute(
      `UPDATE usage_limits 
       SET current_usage = 0, last_reset_at = NOW() 
       WHERE reset_period = 'weekly' 
       AND (last_reset_at IS NULL OR WEEK(last_reset_at) < WEEK(NOW()))`
    );
    
    // Reset monthly limits
    await connection.execute(
      `UPDATE usage_limits 
       SET current_usage = 0, last_reset_at = NOW() 
       WHERE reset_period = 'monthly' 
       AND (last_reset_at IS NULL OR MONTH(last_reset_at) < MONTH(NOW()))`
    );
    
    // Reset yearly limits
    await connection.execute(
      `UPDATE usage_limits 
       SET current_usage = 0, last_reset_at = NOW() 
       WHERE reset_period = 'yearly' 
       AND (last_reset_at IS NULL OR YEAR(last_reset_at) < YEAR(NOW()))`
    );
    
    connection.release();
  } catch (error) {
    console.error('Error resetting usage limits:', error);
    throw error;
  }
}

/**
 * Notify about usage limit
 */
async function notifyUsageLimit(clientId, systemId, metric, currentUsage, limitValue, percentUsed) {
  try {
    const { sendEmail } = require('./emailService');
    const connection = await pool.getConnection();
    
    // Get client email
    const [client] = await connection.execute(
      'SELECT company_email FROM clients WHERE id = ?',
      [clientId]
    );
    
    // Get system name
    const [system] = await connection.execute(
      'SELECT name FROM saas_systems WHERE id = ?',
      [systemId]
    );
    
    connection.release();
    
    if (client.length > 0 && system.length > 0) {
      const status = percentUsed >= 100 ? 'exceeded' : 'approaching';
      
      await sendEmail({
        to: client[0].company_email,
        subject: `Usage Limit ${status === 'exceeded' ? 'Exceeded' : 'Warning'} - ${system[0].name}`,
        html: `
          <h2>Usage Limit ${status === 'exceeded' ? 'Exceeded' : 'Warning'}</h2>
          <p>Your usage for <strong>${metric}</strong> in <strong>${system[0].name}</strong> has ${status === 'exceeded' ? 'exceeded' : 'reached'} ${percentUsed.toFixed(0)}% of the limit.</p>
          <p>Current Usage: ${currentUsage} / ${limitValue}</p>
          <p>Please consider upgrading your plan or contact support.</p>
        `
      });
    }
  } catch (error) {
    console.error('Error notifying usage limit:', error);
  }
}

/**
 * Get usage statistics
 */
async function getUsageStatistics(clientId, systemId, days = 30) {
  try {
    const connection = await pool.getConnection();
    
    const [results] = await connection.execute(
      `SELECT 
        DATE(created_at) as date,
        metric,
        SUM(quantity) as total_quantity
       FROM usage_records 
       WHERE client_id = ? AND system_id = ? 
       AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY DATE(created_at), metric
       ORDER BY date DESC, metric`,
      [clientId, systemId, days]
    );
    
    connection.release();
    
    return results;
  } catch (error) {
    console.error('Error getting usage statistics:', error);
    throw error;
  }
}

module.exports = {
  recordUsage,
  getUsage,
  calculateUsageCost,
  setUsageLimit,
  checkUsageLimit,
  resetUsageLimits,
  getUsageStatistics
};
