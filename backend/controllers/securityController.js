/**
 * Security Controller
 * Handles device activation, validation, and security monitoring
 */

const { pool } = require('../config/database');
const crypto = require('crypto');

/**
 * Generate secure license token
 */
function generateLicenseToken(subscriptionId, deviceFingerprint) {
  const payload = {
    sub_id: subscriptionId,
    device: deviceFingerprint,
    issued: Date.now(),
    expires: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
  };
  
  const secret = process.env.JWT_SECRET || 'your-secret-key';
  const token = Buffer.from(JSON.stringify(payload)).toString('base64');
  const signature = crypto.createHmac('sha256', secret).update(token).digest('hex');
  
  return `${token}.${signature}`;
}

/**
 * Activate a new device for a subscription
 */
exports.activateDevice = async (req, res) => {
  try {
    const { api_key, device_fingerprint, device_info } = req.body;
    const { ip, headers } = req;

    if (!api_key || !device_fingerprint) {
      return res.status(400).json({
        success: false,
        message: 'API key and device fingerprint are required'
      });
    }

    // Get subscription
    const [subscriptions] = await pool.execute(
      `SELECT cs.*, c.company_name, s.name as system_name
       FROM client_subscriptions cs
       JOIN clients c ON cs.client_id = c.id
       JOIN systems s ON cs.system_id = s.id
       WHERE cs.api_key = ? AND cs.status = 'active'`,
      [api_key]
    );

    if (subscriptions.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or inactive API key'
      });
    }

    const subscription = subscriptions[0];

    // Check if device already activated
    const [existingDevices] = await pool.execute(
      `SELECT * FROM device_activations 
       WHERE subscription_id = ? AND device_fingerprint = ?`,
      [subscription.id, device_fingerprint]
    );

    if (existingDevices.length > 0) {
      const device = existingDevices[0];
      
      if (device.status === 'active') {
        // Already activated, generate new token
        const token = generateLicenseToken(subscription.id, device_fingerprint);
        
        // Save token
        await pool.execute(
          `INSERT INTO license_tokens 
           (subscription_id, device_fingerprint, token, expires_at) 
           VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))`,
          [subscription.id, device_fingerprint, token]
        );
        
        return res.json({
          success: true,
          message: 'Device already activated',
          token
        });
      } else if (device.status === 'rejected') {
        return res.status(403).json({
          success: false,
          message: 'Device activation was rejected by administrator'
        });
      } else if (device.status === 'pending') {
        return res.status(202).json({
          success: false,
          message: 'Device activation is pending admin approval',
          status: 'pending'
        });
      }
    }

    // Check activation limit
    const [activeDevices] = await pool.execute(
      `SELECT COUNT(*) as count FROM device_activations 
       WHERE subscription_id = ? AND status = 'active'`,
      [subscription.id]
    );

    if (activeDevices[0].count >= subscription.max_activations) {
      // Create security alert
      await pool.execute(
        `INSERT INTO security_alerts 
         (subscription_id, alert_type, severity, details, device_fingerprint, ip_address) 
         VALUES (?, 'device_limit_exceeded', 'high', ?, ?, ?)`,
        [
          subscription.id,
          JSON.stringify({ 
            message: 'Device limit exceeded',
            current_count: activeDevices[0].count,
            max_allowed: subscription.max_activations,
            new_device: device_info
          }),
          device_fingerprint,
          ip
        ]
      );

      return res.status(403).json({
        success: false,
        message: `Device activation limit reached (${subscription.max_activations} devices maximum). Please contact support or deactivate an existing device.`
      });
    }

    // Auto-approve first device, require approval for additional devices
    const isFirstDevice = activeDevices[0].count === 0;
    const activationStatus = isFirstDevice ? 'active' : 'pending';
    
    // Create device activation
    await pool.execute(
      `INSERT INTO device_activations 
       (subscription_id, device_fingerprint, device_name, device_info, status, ip_address, activated_at) 
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [
        subscription.id,
        device_fingerprint,
        device_info?.device_name || 'Unknown Device',
        JSON.stringify(device_info),
        activationStatus,
        ip
      ]
    );

    // Update activation count
    await pool.execute(
      `UPDATE client_subscriptions 
       SET activation_count = activation_count + 1 
       WHERE id = ?`,
      [subscription.id]
    );

    if (isFirstDevice) {
      // First device - auto-approved, generate token
      const token = generateLicenseToken(subscription.id, device_fingerprint);
      
      // Save token
      await pool.execute(
        `INSERT INTO license_tokens 
         (subscription_id, device_fingerprint, token, expires_at) 
         VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))`,
        [subscription.id, device_fingerprint, token]
      );
      
      return res.json({
        success: true,
        message: 'Device activated successfully',
        token
      });
    } else {
      // Additional device - requires admin approval
      await pool.execute(
        `INSERT INTO security_alerts 
         (subscription_id, alert_type, severity, details, device_fingerprint, ip_address) 
         VALUES (?, 'rapid_activations', 'medium', ?, ?, ?)`,
        [
          subscription.id,
          JSON.stringify({
            message: 'New device activation request',
            device_info,
            company: subscription.company_name
          }),
          device_fingerprint,
          ip
        ]
      );

      return res.status(202).json({
        success: false,
        message: 'Device activation request submitted. Awaiting admin approval.',
        status: 'pending'
      });
    }

  } catch (error) {
    console.error('Error activating device:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to activate device'
    });
  }
};

/**
 * Validate API key with device fingerprint and concurrent use detection
 */
exports.validateApiKey = async (req, res) => {
  try {
    const { api_key, device_fingerprint, device_info } = req.body;
    const { ip, headers } = req;

    if (!api_key) {
      return res.status(400).json({
        success: false,
        message: 'API key is required'
      });
    }

    // Get subscription
    const [subscriptions] = await pool.execute(
      `SELECT cs.*, c.company_name, s.name as system_name
       FROM client_subscriptions cs
       JOIN clients c ON cs.client_id = c.id
       JOIN systems s ON cs.system_id = s.id
       WHERE cs.api_key = ? AND cs.status = 'active'`,
      [api_key]
    );

    if (subscriptions.length === 0) {
      return res.status(401).json({
        success: false,
        valid: false,
        message: 'Invalid or inactive API key'
      });
    }

    const subscription = subscriptions[0];

    // Check if device_fingerprint provided (modern security)
    if (device_fingerprint) {
      // Check if device is activated
      const [devices] = await pool.execute(
        `SELECT * FROM device_activations 
         WHERE subscription_id = ? AND device_fingerprint = ?`,
        [subscription.id, device_fingerprint]
      );

      if (devices.length === 0) {
        return res.status(403).json({
          success: false,
          valid: false,
          message: 'Device not activated. Please activate this device first.'
        });
      }

      const device = devices[0];

      if (device.status !== 'active') {
        if (device.status === 'pending') {
          return res.status(403).json({
            success: false,
            valid: false,
            message: 'Device activation is pending admin approval'
          });
        } else if (device.status === 'rejected') {
          return res.status(403).json({
            success: false,
            valid: false,
            message: 'Device has been rejected by administrator'
          });
        } else if (device.status === 'revoked') {
          return res.status(403).json({
            success: false,
            valid: false,
            message: 'Device access has been revoked'
          });
        }
      }

      // Update last seen
      await pool.execute(
        `UPDATE device_activations 
         SET last_seen = NOW(), ip_address = ? 
         WHERE id = ?`,
        [ip, device.id]
      );

      // Concurrent use detection - check if API key used from different device within last hour
      const [recentUsage] = await pool.execute(
        `SELECT DISTINCT device_fingerprint, ip_address, request_timestamp 
         FROM api_usage_logs 
         WHERE api_key = ? 
           AND request_timestamp > DATE_SUB(NOW(), INTERVAL 1 HOUR)
           AND device_fingerprint != ?
         LIMIT 1`,
        [api_key, device_fingerprint]
      );

      if (recentUsage.length > 0) {
        // Concurrent use detected!
        await pool.execute(
          `INSERT INTO security_alerts 
           (subscription_id, alert_type, severity, details, device_fingerprint, ip_address) 
           VALUES (?, 'concurrent_use', 'critical', ?, ?, ?)`,
          [
            subscription.id,
            JSON.stringify({
              message: 'Concurrent use detected',
              current_device: device_fingerprint,
              current_ip: ip,
              other_device: recentUsage[0].device_fingerprint,
              other_ip: recentUsage[0].ip_address,
              time_diff_minutes: Math.round((Date.now() - new Date(recentUsage[0].request_timestamp).getTime()) / 60000)
            }),
            device_fingerprint,
            ip
          ]
        );

        // For now, allow but log the alert
        // Admin can review and take action
      }
    }

    // Log API usage
    await pool.execute(
      `INSERT INTO api_usage_logs 
       (subscription_id, api_key, endpoint, method, ip_address, user_agent, device_fingerprint) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        subscription.id,
        api_key,
        req.path,
        req.method,
        ip,
        headers['user-agent'],
        device_fingerprint || null
      ]
    );

    // Generate new token
    const token = device_fingerprint 
      ? generateLicenseToken(subscription.id, device_fingerprint)
      : null;

    // Save token if generated
    if (token && device_fingerprint) {
      await pool.execute(
        `INSERT INTO license_tokens 
         (subscription_id, device_fingerprint, token, expires_at) 
         VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))`,
        [subscription.id, device_fingerprint, token]
      );
    }

    res.json({
      success: true,
      valid: true,
      token,
      subscription: {
        id: subscription.id,
        company_name: subscription.company_name,
        system_name: subscription.system_name,
        database_name: subscription.database_name,
        end_date: subscription.end_date
      }
    });

  } catch (error) {
    console.error('Error validating API key:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate API key'
    });
  }
};

/**
 * Get all security alerts
 */
exports.getSecurityAlerts = async (req, res) => {
  try {
    const { status, severity, alert_type } = req.query;
    
    let query = `
      SELECT sa.*, 
             cs.api_key, 
             c.company_name, 
             s.name as system_name
      FROM security_alerts sa
      JOIN client_subscriptions cs ON sa.subscription_id = cs.id
      JOIN clients c ON cs.client_id = c.id
      JOIN systems s ON cs.system_id = s.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (status) {
      query += ' AND sa.status = ?';
      params.push(status);
    }
    
    if (severity) {
      query += ' AND sa.severity = ?';
      params.push(severity);
    }
    
    if (alert_type) {
      query += ' AND sa.alert_type = ?';
      params.push(alert_type);
    }
    
    query += ' ORDER BY sa.created_at DESC LIMIT 100';
    
    const [alerts] = await pool.execute(query, params);
    
    res.json({
      success: true,
      alerts
    });
    
  } catch (error) {
    console.error('Error fetching security alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch security alerts'
    });
  }
};

/**
 * Get pending device activations
 */
exports.getPendingDevices = async (req, res) => {
  try {
    const [devices] = await pool.execute(
      `SELECT da.*, 
              cs.api_key, 
              c.company_name, 
              s.name as system_name,
              cs.max_activations,
              (SELECT COUNT(*) FROM device_activations 
               WHERE subscription_id = da.subscription_id AND status = 'active') as active_count
       FROM device_activations da
       JOIN client_subscriptions cs ON da.subscription_id = cs.id
       JOIN clients c ON cs.client_id = c.id
       JOIN systems s ON cs.system_id = s.id
       WHERE da.status = 'pending'
       ORDER BY da.first_activated DESC`
    );
    
    res.json({
      success: true,
      devices
    });
    
  } catch (error) {
    console.error('Error fetching pending devices:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending devices'
    });
  }
};

/**
 * Approve a device activation
 */
exports.approveDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;
    
    // Update device status
    await pool.execute(
      `UPDATE device_activations 
       SET status = 'active', approved_by = ?, approved_at = NOW() 
       WHERE id = ?`,
      [adminId, id]
    );
    
    // Update device count
    const [device] = await pool.execute(
      'SELECT subscription_id FROM device_activations WHERE id = ?',
      [id]
    );
    
    if (device.length > 0) {
      await pool.execute(
        `UPDATE client_subscriptions 
         SET device_count = (SELECT COUNT(*) FROM device_activations 
                            WHERE subscription_id = ? AND status = 'active')
         WHERE id = ?`,
        [device[0].subscription_id, device[0].subscription_id]
      );
    }
    
    res.json({
      success: true,
      message: 'Device approved successfully'
    });
    
  } catch (error) {
    console.error('Error approving device:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve device'
    });
  }
};

/**
 * Reject a device activation
 */
exports.rejectDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.user.id;
    
    await pool.execute(
      `UPDATE device_activations 
       SET status = 'rejected', approved_by = ?, approved_at = NOW(), rejection_reason = ? 
       WHERE id = ?`,
      [adminId, reason || 'Rejected by administrator', id]
    );
    
    res.json({
      success: true,
      message: 'Device rejected successfully'
    });
    
  } catch (error) {
    console.error('Error rejecting device:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject device'
    });
  }
};

/**
 * Resolve a security alert
 */
exports.resolveSecurityAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const { action_taken, resolution_notes } = req.body;
    const adminId = req.user.id;
    
    await pool.execute(
      `UPDATE security_alerts 
       SET status = 'resolved', 
           reviewed_by = ?, 
           reviewed_at = NOW(), 
           action_taken = ?, 
           resolution_notes = ? 
       WHERE id = ?`,
      [adminId, action_taken || 'none', resolution_notes, id]
    );
    
    res.json({
      success: true,
      message: 'Security alert resolved'
    });
    
  } catch (error) {
    console.error('Error resolving alert:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resolve alert'
    });
  }
};

/**
 * Get all devices for a subscription
 */
exports.getSubscriptionDevices = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [devices] = await pool.execute(
      `SELECT * FROM device_activations 
       WHERE subscription_id = ? 
       ORDER BY last_seen DESC`,
      [id]
    );
    
    res.json({
      success: true,
      devices
    });
    
  } catch (error) {
    console.error('Error fetching subscription devices:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch devices'
    });
  }
};

module.exports = exports;
