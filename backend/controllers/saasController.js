/**
 * SaaS Controller
 * 
 * Handles all SaaS system management operations
 */

const { pool } = require('../config/database');
const crypto = require('crypto');
const securityController = require('./securityController');
const dbSync = require('../utils/databaseSync');

// Export security controller methods
exports.activateDevice = securityController.activateDevice;
exports.validateApiKey = securityController.validateApiKey;
exports.getSecurityAlerts = securityController.getSecurityAlerts;
exports.getPendingDevices = securityController.getPendingDevices;
exports.approveDevice = securityController.approveDevice;
exports.rejectDevice = securityController.rejectDevice;
exports.resolveSecurityAlert = securityController.resolveSecurityAlert;
exports.getSubscriptionDevices = securityController.getSubscriptionDevices;

/**
 * Get all available systems
 */
exports.getAllSystems = async (req, res) => {
  try {
    const [systems] = await pool.execute(
      'SELECT * FROM systems WHERE status = ? ORDER BY category, name',
      ['active']
    );
    
    // Parse JSON fields
    const parsedSystems = systems.map(system => ({
      ...system,
      features: JSON.parse(system.features || '[]')
    }));
    
    res.json({
      success: true,
      systems: parsedSystems
    });
  } catch (error) {
    console.error('Error fetching systems:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch systems'
    });
  }
};

/**
 * Get system by ID with plans
 */
exports.getSystemById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [systems] = await pool.execute(
      'SELECT * FROM systems WHERE id = ? AND status = ?',
      [id, 'active']
    );
    
    if (systems.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'System not found'
      });
    }
    
    const [plans] = await pool.execute(
      'SELECT * FROM subscription_plans WHERE system_id = ? AND is_active = ?',
      [id, true]
    );
    
    const system = {
      ...systems[0],
      features: JSON.parse(systems[0].features || '[]'),
      plans: plans.map(plan => ({
        ...plan,
        features: JSON.parse(plan.features || '[]')
      }))
    };
    
    res.json({
      success: true,
      system
    });
  } catch (error) {
    console.error('Error fetching system:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system'
    });
  }
};

/**
 * Create new system (Admin only)
 */
exports.createSystem = async (req, res) => {
  try {
    const { name, description, category, python_file_path, icon_url, features } = req.body;
    
    const [result] = await pool.execute(
      'INSERT INTO systems (name, description, category, python_file_path, icon_url, features) VALUES (?, ?, ?, ?, ?, ?)',
      [name, description, category, python_file_path, icon_url, JSON.stringify(features)]
    );
    
    res.json({
      success: true,
      message: 'System created successfully',
      systemId: result.insertId
    });
  } catch (error) {
    console.error('Error creating system:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create system'
    });
  }
};

/**
 * Update system (Admin only)
 */
exports.updateSystem = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, category, python_file_path, icon_url, features, status } = req.body;
    
    await pool.execute(
      'UPDATE systems SET name = ?, description = ?, category = ?, python_file_path = ?, icon_url = ?, features = ?, status = ? WHERE id = ?',
      [name, description, category, python_file_path, icon_url, JSON.stringify(features), status, id]
    );
    
    res.json({
      success: true,
      message: 'System updated successfully'
    });
  } catch (error) {
    console.error('Error updating system:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update system'
    });
  }
};

/**
 * Delete system (Admin only)
 */
exports.deleteSystem = async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.execute('DELETE FROM systems WHERE id = ?', [id]);
    
    res.json({
      success: true,
      message: 'System deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting system:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete system'
    });
  }
};

/**
 * Get all subscription plans for a system
 */
exports.getSystemPlans = async (req, res) => {
  try {
    const { systemId } = req.params;
    
    const [plans] = await pool.execute(
      'SELECT * FROM subscription_plans WHERE system_id = ? AND is_active = ? ORDER BY price',
      [systemId, true]
    );
    
    const parsedPlans = plans.map(plan => ({
      ...plan,
      features: JSON.parse(plan.features || '[]')
    }));
    
    res.json({
      success: true,
      plans: parsedPlans
    });
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch plans'
    });
  }
};

/**
 * Create subscription plan (Admin only)
 */
exports.createPlan = async (req, res) => {
  try {
    const { system_id, name, description, price, billing_cycle, features, max_users, max_storage_gb, support_level } = req.body;
    
    const [result] = await pool.execute(
      'INSERT INTO subscription_plans (system_id, name, description, price, billing_cycle, features, max_users, max_storage_gb, support_level) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [system_id, name, description, price, billing_cycle, JSON.stringify(features), max_users, max_storage_gb, support_level]
    );
    
    res.json({
      success: true,
      message: 'Plan created successfully',
      planId: result.insertId
    });
  } catch (error) {
    console.error('Error creating plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create plan'
    });
  }
};

/**
 * Purchase system subscription
 */
exports.purchaseSubscription = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const userId = req.user.id;
    const { system_id, plan_id, company_name, contact_email, contact_phone, billing_cycle } = req.body;
    
    // Check if client exists for this user
    let [clients] = await connection.execute(
      'SELECT id FROM clients WHERE user_id = ?',
      [userId]
    );
    
    let clientId;
    
    if (clients.length === 0) {
      // Create new client
      const [clientResult] = await connection.execute(
        'INSERT INTO clients (user_id, company_name, contact_email, contact_phone) VALUES (?, ?, ?, ?)',
        [userId, company_name, contact_email, contact_phone]
      );
      clientId = clientResult.insertId;
    } else {
      clientId = clients[0].id;
    }
    
    // Get plan details
    const [plans] = await connection.execute(
      'SELECT * FROM subscription_plans WHERE id = ?',
      [plan_id]
    );
    
    if (plans.length === 0) {
      throw new Error('Plan not found');
    }
    
    const plan = plans[0];
    
    // Generate unique identifiers
    const apiKey = crypto.randomBytes(32).toString('hex');
    const databaseName = `saas_${company_name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;
    const subdomain = `${company_name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`;
    
    // Calculate dates
    const startDate = new Date();
    const endDate = new Date();
    
    switch (billing_cycle) {
      case 'monthly':
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case 'quarterly':
        endDate.setMonth(endDate.getMonth() + 3);
        break;
      case 'yearly':
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
    }
    
    // Create subscription
    const [subscriptionResult] = await connection.execute(
      `INSERT INTO client_subscriptions 
       (client_id, system_id, plan_id, database_name, subdomain, api_key, status, start_date, end_date, total_amount) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [clientId, system_id, plan_id, databaseName, subdomain, apiKey, 'active', startDate, endDate, plan.price]
    );
    
    const subscriptionId = subscriptionResult.insertId;
    
    // Create payment record
    await connection.execute(
      'INSERT INTO payments (client_id, subscription_id, amount, status, transaction_id) VALUES (?, ?, ?, ?, ?)',
      [clientId, subscriptionId, plan.price, 'completed', `TXN-${Date.now()}`]
    );
    
    // Create welcome notification
    await connection.execute(
      'INSERT INTO system_notifications (client_id, subscription_id, title, message, type) VALUES (?, ?, ?, ?, ?)',
      [
        clientId,
        subscriptionId,
        'Welcome to Your New System!',
        `Your ${plan.name} subscription has been activated successfully. Your API key and access details are ready.`,
        'success'
      ]
    );
    
    // TODO: Create separate database for client
    // This would involve creating a new MySQL database dynamically
    
    await connection.commit();
    
    res.json({
      success: true,
      message: 'Subscription purchased successfully',
      subscription: {
        id: subscriptionId,
        apiKey,
        databaseName,
        subdomain,
        status: 'active',
        startDate,
        endDate
      }
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Error purchasing subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to purchase subscription'
    });
  } finally {
    connection.release();
  }
};

/**
 * Get user's subscriptions
 */
exports.getMySubscriptions = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const [subscriptions] = await pool.execute(
      `SELECT 
        cs.*,
        s.name as system_name,
        s.description as system_description,
        s.icon_url,
        sp.name as plan_name,
        sp.price,
        sp.billing_cycle,
        c.company_name
       FROM client_subscriptions cs
       JOIN clients c ON cs.client_id = c.id
       JOIN systems s ON cs.system_id = s.id
       JOIN subscription_plans sp ON cs.plan_id = sp.id
       WHERE c.user_id = ?
       ORDER BY cs.created_at DESC`,
      [userId]
    );
    
    res.json({
      success: true,
      subscriptions
    });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscriptions'
    });
  }
};

/**
 * Get all clients and subscriptions (Admin only)
 */
exports.getAllClientsAndSubscriptions = async (req, res) => {
  try {
    const [clients] = await pool.execute(
      `SELECT 
        c.*,
        u.email as user_email,
        u.fullName as user_name,
        COUNT(cs.id) as total_subscriptions,
        SUM(CASE WHEN cs.status = 'active' THEN 1 ELSE 0 END) as active_subscriptions
       FROM clients c
       JOIN users u ON c.user_id = u.id
       LEFT JOIN client_subscriptions cs ON c.id = cs.client_id
       GROUP BY c.id
       ORDER BY c.created_at DESC`
    );
    
    res.json({
      success: true,
      clients
    });
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch clients'
    });
  }
};

/**
 * Get subscription details by ID
 */
exports.getSubscriptionById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const [subscriptions] = await pool.execute(
      `SELECT 
        cs.*,
        s.name as system_name,
        s.description as system_description,
        s.category,
        s.features as system_features,
        s.icon_url,
        sp.name as plan_name,
        sp.price,
        sp.billing_cycle,
        sp.features as plan_features,
        c.company_name,
        c.contact_email,
        c.contact_phone
       FROM client_subscriptions cs
       JOIN clients c ON cs.client_id = c.id
       JOIN systems s ON cs.system_id = s.id
       JOIN subscription_plans sp ON cs.plan_id = sp.id
       WHERE cs.id = ? AND c.user_id = ?`,
      [id, userId]
    );
    
    if (subscriptions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }
    
    const subscription = {
      ...subscriptions[0],
      system_features: JSON.parse(subscriptions[0].system_features || '[]'),
      plan_features: JSON.parse(subscriptions[0].plan_features || '[]')
    };
    
    res.json({
      success: true,
      subscription
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription'
    });
  }
};

/**
 * Get API usage statistics
 */
exports.getApiUsageStats = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const userId = req.user.id;
    
    // Verify ownership
    const [subscriptions] = await pool.execute(
      `SELECT cs.id FROM client_subscriptions cs
       JOIN clients c ON cs.client_id = c.id
       WHERE cs.id = ? AND c.user_id = ?`,
      [subscriptionId, userId]
    );
    
    if (subscriptions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }
    
    const [stats] = await pool.execute(
      `SELECT 
        COUNT(*) as total_requests,
        COUNT(DISTINCT ip_address) as unique_ips,
        COUNT(DISTINCT DATE(request_timestamp)) as active_days,
        MAX(request_timestamp) as last_request
       FROM api_usage_logs
       WHERE subscription_id = ?`,
      [subscriptionId]
    );
    
    const [recentLogs] = await pool.execute(
      `SELECT * FROM api_usage_logs
       WHERE subscription_id = ?
       ORDER BY request_timestamp DESC
       LIMIT 100`,
      [subscriptionId]
    );
    
    res.json({
      success: true,
      stats: stats[0],
      recentLogs
    });
  } catch (error) {
    console.error('Error fetching API usage:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch API usage'
    });
  }
};

/**
 * Get security information for a subscription
 */
exports.getSecurityInfo = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const userId = req.user.id;
    
    // Verify ownership
    const [subscriptions] = await pool.execute(
      `SELECT cs.*, c.user_id
       FROM client_subscriptions cs
       JOIN clients c ON cs.client_id = c.id
       WHERE cs.id = ? AND c.user_id = ?`,
      [subscriptionId, userId]
    );
    
    if (subscriptions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }
    
    const subscription = subscriptions[0];
    
    // Get last seen from device activations
    const [devices] = await pool.execute(
      `SELECT MAX(last_seen) as last_seen
       FROM device_activations
       WHERE subscription_id = ? AND status = 'active'`,
      [subscriptionId]
    );
    
    res.json({
      success: true,
      security: {
        device_count: subscription.device_count || 0,
        max_devices: subscription.max_devices || 3,
        activation_count: subscription.activation_count || 0,
        max_activations: subscription.max_activations || 3,
        is_activated: subscription.is_activated || false,
        last_seen: devices[0]?.last_seen || null
      }
    });
  } catch (error) {
    console.error('Error fetching security info:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch security information'
    });
  }
};

/**
 * Cancel subscription
 */
exports.cancelSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Verify ownership
    const [subscriptions] = await pool.execute(
      `SELECT cs.id, cs.client_id FROM client_subscriptions cs
       JOIN clients c ON cs.client_id = c.id
       WHERE cs.id = ? AND c.user_id = ?`,
      [id, userId]
    );
    
    if (subscriptions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }
    
    // Update subscription status
    await pool.execute(
      'UPDATE client_subscriptions SET status = ?, auto_renew = ? WHERE id = ?',
      ['cancelled', false, id]
    );
    
    // Create notification
    await pool.execute(
      'INSERT INTO system_notifications (client_id, subscription_id, title, message, type) VALUES (?, ?, ?, ?, ?)',
      [
        subscriptions[0].client_id,
        id,
        'Subscription Cancelled',
        'Your subscription has been cancelled. You can continue using the system until the end of your billing period.',
        'warning'
      ]
    );
    
    res.json({
      success: true,
      message: 'Subscription cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel subscription'
    });
  }
};

/**
 * Get dashboard statistics (Admin only)
 */
exports.getDashboardStats = async (req, res) => {
  try {
    const [systemsCount] = await pool.execute('SELECT COUNT(*) as count FROM systems WHERE status = "active"');
    const [clientsCount] = await pool.execute('SELECT COUNT(*) as count FROM clients WHERE status = "active"');
    const [subscriptionsCount] = await pool.execute('SELECT COUNT(*) as count FROM client_subscriptions WHERE status = "active"');
    const [revenue] = await pool.execute('SELECT SUM(amount) as total FROM payments WHERE status = "completed" AND MONTH(payment_date) = MONTH(CURRENT_DATE())');
    
    const [recentSubscriptions] = await pool.execute(
      `SELECT cs.*, c.company_name, s.name as system_name, sp.name as plan_name
       FROM client_subscriptions cs
       JOIN clients c ON cs.client_id = c.id
       JOIN systems s ON cs.system_id = s.id
       JOIN subscription_plans sp ON cs.plan_id = sp.id
       ORDER BY cs.created_at DESC
       LIMIT 10`
    );
    
    res.json({
      success: true,
      stats: {
        totalSystems: systemsCount[0].count,
        totalClients: clientsCount[0].count,
        activeSubscriptions: subscriptionsCount[0].count,
        monthlyRevenue: revenue[0].total || 0,
        recentSubscriptions
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics'
    });
  }
};

/**
 * Update a subscription plan
 */
exports.updatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, billing_cycle, features, max_users, max_storage_gb, support_level } = req.body;
    
    await pool.execute(
      'UPDATE subscription_plans SET name = ?, description = ?, price = ?, billing_cycle = ?, features = ?, max_users = ?, max_storage_gb = ?, support_level = ? WHERE id = ?',
      [name, description, price, billing_cycle, features, max_users, max_storage_gb, support_level, id]
    );
    
    res.json({
      success: true,
      message: 'Plan updated successfully'
    });
  } catch (error) {
    console.error('Error updating plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update plan'
    });
  }
};

/**
 * Delete a subscription plan
 */
exports.deletePlan = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if plan is being used by any active subscriptions
    const [subscriptions] = await pool.execute(
      'SELECT COUNT(*) as count FROM client_subscriptions WHERE plan_id = ? AND status = ?',
      [id, 'active']
    );
    
    if (subscriptions[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete plan with active subscriptions'
      });
    }
    
    await pool.execute('DELETE FROM subscription_plans WHERE id = ?', [id]);
    
    res.json({
      success: true,
      message: 'Plan deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete plan'
    });
  }
};

/**
 * Download system application
 */
exports.downloadSystem = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const userId = req.user.id;
    
    // Verify subscription belongs to user and is active
    const [subscriptions] = await pool.execute(`
      SELECT cs.*, s.name as system_name, s.python_file_path, sp.name as plan_name
      FROM client_subscriptions cs
      JOIN clients c ON cs.client_id = c.id
      JOIN systems s ON cs.system_id = s.id
      JOIN subscription_plans sp ON cs.plan_id = sp.id
      WHERE cs.id = ? AND c.user_id = ? AND cs.status = 'active'
    `, [subscriptionId, userId]);
    
    if (subscriptions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Active subscription not found'
      });
    }
    
    const subscription = subscriptions[0];
    
    // Determine tier from plan name
    const tier = subscription.plan_name.toLowerCase().includes('premium') ? 'premium' : 'basic';
    
    // Construct file path
    const path = require('path');
    const fs = require('fs');
    const archiver = require('archiver');
    
    // Clean up python_file_path - remove 'systems/' prefix if present, ensure trailing slash
    let cleanPath = subscription.python_file_path;
    if (cleanPath.startsWith('systems/')) {
      cleanPath = cleanPath.substring(8); // Remove 'systems/' prefix
    }
    if (!cleanPath.endsWith('/')) {
      cleanPath += '/';
    }
    
    // Path to system folder
    const systemFolder = path.join(__dirname, '../../systems', cleanPath, tier);
    
    console.log('Download path:', systemFolder);
    
    if (!fs.existsSync(systemFolder)) {
      return res.status(404).json({
        success: false,
        message: 'System files not found'
      });
    }
    
    // Set response headers for download
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${subscription.system_name}_${tier}.zip"`);
    
    // Create zip archive
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });
    
    archive.on('error', (err) => {
      console.error('Archive error:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to create download package'
      });
    });
    
    // Pipe archive to response
    archive.pipe(res);
    
    // Add files to archive
    archive.directory(systemFolder, false);
    
    // Add configuration file with API key
    const config = {
      api_key: subscription.api_key,
      company_name: subscription.company_name,
      subscription_id: subscription.id,
      plan: subscription.plan_name,
      start_date: subscription.start_date,
      end_date: subscription.end_date
    };
    
    archive.append(JSON.stringify(config, null, 2), { name: 'subscription_config.json' });
    
    // Finalize the archive
    await archive.finalize();
    
    // Log download
    await pool.execute(`
      INSERT INTO api_usage_logs (subscription_id, api_key, endpoint, method, ip_address)
      VALUES (?, ?, ?, ?, ?)
    `, [subscription.id, subscription.api_key, '/download', 'GET', req.ip]);
    
  } catch (error) {
    console.error('Error downloading system:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download system'
    });
  }
};

/**
 * Generate customized system with business branding
 */
exports.generateCustomSystem = async (req, res) => {
  try {
    const { subscription_id, business_name, address, phone, email } = req.body;
    const userId = req.user.id;
    const logoFile = req.file;
    
    // Verify subscription belongs to user and is active
    const [subscriptions] = await pool.execute(`
      SELECT cs.*, s.name as system_name, s.python_file_path, sp.name as plan_name
      FROM client_subscriptions cs
      JOIN clients c ON cs.client_id = c.id
      JOIN systems s ON cs.system_id = s.id
      JOIN subscription_plans sp ON cs.plan_id = sp.id
      WHERE cs.id = ? AND c.user_id = ? AND cs.status = 'active'
    `, [subscription_id, userId]);
    
    if (subscriptions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Active subscription not found'
      });
    }
    
    const subscription = subscriptions[0];
    
    // Get user email for remote database naming
    const [users] = await pool.execute(
      'SELECT email FROM users WHERE id = ?',
      [userId]
    );
    const userEmail = users[0]?.email;
    
    // Create remote backup database for this subscription
    let remoteDbResult = null;
    try {
      // Create empty remote database (tables will be synced from client)
      // Note: table_schema column doesn't exist in systems table yet
      // Tables will be created automatically when client first syncs
      const tables = []; // Empty initially, will be populated by client sync
      
      remoteDbResult = await dbSync.createRemoteDatabase(
        userEmail,
        subscription.system_name,
        subscription.database_name,
        tables
      );
      
      console.log('Remote backup database created:', remoteDbResult.database_name);
      
      // Store remote database name in subscription
      await pool.execute(
        `UPDATE client_subscriptions SET remote_database_name = ? WHERE id = ?`,
        [remoteDbResult.database_name, subscription_id]
      );
      
    } catch (dbError) {
      console.error('Error creating remote database:', dbError);
      // Continue anyway - remote sync is optional
    }
    
    // Determine tier from plan name
    const tier = subscription.plan_name.toLowerCase().includes('premium') ? 'premium' : 'basic';
    
    // Construct file paths
    const path = require('path');
    const fs = require('fs');
    const archiver = require('archiver');
    
    // Path to system folder
    const systemFolder = path.join(__dirname, '../../systems', subscription.python_file_path, tier);
    
    if (!fs.existsSync(systemFolder)) {
      return res.status(404).json({
        success: false,
        message: 'System files not found'
      });
    }
    
    // Create temporary directory for customized files
    const tempDir = path.join(__dirname, '../uploads/temp', `custom_${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    
    try {
      // Copy all files from system folder to temp directory
      const copyRecursive = (src, dest) => {
        const exists = fs.existsSync(src);
        const stats = exists && fs.statSync(src);
        const isDirectory = exists && stats.isDirectory();
        
        if (isDirectory) {
          fs.mkdirSync(dest, { recursive: true });
          fs.readdirSync(src).forEach(childItemName => {
            copyRecursive(
              path.join(src, childItemName),
              path.join(dest, childItemName)
            );
          });
        } else {
          fs.copyFileSync(src, dest);
        }
      };
      
      copyRecursive(systemFolder, tempDir);
      
      // Copy logo if uploaded
      if (logoFile) {
        const logoDestPath = path.join(tempDir, 'logo' + path.extname(logoFile.originalname));
        fs.copyFileSync(logoFile.path, logoDestPath);
        // Delete uploaded file
        fs.unlinkSync(logoFile.path);
      }
      
      // Create customization config file
      const customConfig = {
        api_key: subscription.api_key,
        company_name: business_name,
        subscription_id: subscription.id,
        plan: subscription.plan_name,
        tier: tier,
        start_date: subscription.start_date,
        end_date: subscription.end_date,
        business_details: {
          name: business_name,
          address: address || '',
          phone: phone,
          email: email || '',
          has_logo: !!logoFile
        },
        database_config: {
          database_name: subscription.database_name,
          subdomain: subscription.subdomain,
          remote_database_name: remoteDbResult?.database_name || '',
          sync_enabled: true,
          sync_url: `${process.env.API_URL || 'http://localhost:5001'}/api/saas/sync`
        }
      };
      
      // Write config file
      fs.writeFileSync(
        path.join(tempDir, 'business_config.json'),
        JSON.stringify(customConfig, null, 2)
      );
      
      // Create Windows launcher batch file
      const batchContent = `@echo off
title ${business_name} - System Installer
color 0A
echo.
echo ================================================
echo    ${business_name}
echo    System Installation Wizard
echo ================================================
echo.
echo Checking Python installation...
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed!
    echo.
    echo Please install Python 3.8 or higher from:
    echo https://www.python.org/downloads/
    echo.
    echo Make sure to check "Add Python to PATH" during installation.
    echo.
    pause
    exit /b 1
)

echo Python found! Starting installation wizard...
echo.
python installer.py

if %errorlevel% neq 0 (
    echo.
    echo Installation failed or was cancelled.
    echo.
    pause
)
`;
      
      fs.writeFileSync(path.join(tempDir, 'INSTALL.bat'), batchContent);
      
      // Create enhanced README
      const readmeContent = `# ${business_name} - ${subscription.system_name}

## Installation Instructions

### Quick Start (Windows)
1. **Double-click** \`INSTALL.bat\` to start the installation wizard
2. Follow the on-screen instructions

### Manual Installation (All Platforms)
\`\`\`bash
# Install Python dependencies
pip install -r requirements.txt

# Run the installer
python installer.py
\`\`\`

### Prerequisites
- Python 3.8 or higher
- Windows 10/11 (or compatible OS)
- Internet connection for first-time setup

### What's Included
- ✅ Pre-configured for ${business_name}
- ✅ API key already set up
- ✅ Custom branding and logo
- ✅ Database configuration
- ✅ Installation wizard

### Support
If you encounter any issues during installation:
1. Make sure Python is installed and added to PATH
2. Run Command Prompt as Administrator
3. Contact ZORO9X support: support@zoro9x.com

### Subscription Details
- Plan: ${subscription.plan_name}
- Valid Until: ${new Date(subscription.end_date).toLocaleDateString()}
- API Key: ${subscription.api_key.substring(0, 8)}...

---
Powered by ZORO9X - Professional Business Management Solutions
`;
      
      fs.writeFileSync(path.join(tempDir, 'README.md'), readmeContent);
      
      // Modify gym_app.py to load business config
      const gymAppPath = path.join(tempDir, 'gym_app.py');
      if (fs.existsSync(gymAppPath)) {
        let gymAppContent = fs.readFileSync(gymAppPath, 'utf8');
        
        // Add business config loading
        const configLoadCode = `
# Load business configuration
BUSINESS_CONFIG_FILE = 'business_config.json'

def load_business_config():
    if os.path.exists(BUSINESS_CONFIG_FILE):
        with open(BUSINESS_CONFIG_FILE, 'r') as f:
            return json.load(f)
    return {}

BUSINESS_CONFIG = load_business_config()
`;
        
        // Insert after imports
        const importEndIndex = gymAppContent.lastIndexOf('import');
        const nextNewlineIndex = gymAppContent.indexOf('\n', importEndIndex);
        gymAppContent = gymAppContent.slice(0, nextNewlineIndex + 1) + configLoadCode + gymAppContent.slice(nextNewlineIndex + 1);
        
        // Replace company name placeholder
        gymAppContent = gymAppContent.replace(
          /self\.company_name = self\.config\.get\('company_name', 'My Gym'\)/g,
          `self.company_name = BUSINESS_CONFIG.get('business_details', {}).get('name', '${business_name}')`
        );
        
        fs.writeFileSync(gymAppPath, gymAppContent);
      }
      
      // Set response headers for download
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${subscription.system_name}_${tier}_installer.zip"`);
      
      // Create zip archive
      const archive = archiver('zip', {
        zlib: { level: 9 }
      });
      
      archive.on('error', (err) => {
        console.error('Archive error:', err);
        throw err;
      });
      
      // Pipe archive to response
      archive.pipe(res);
      
      // Add all files from temp directory
      archive.directory(tempDir, false);
      
      // Finalize the archive
      await archive.finalize();
      
      // Clean up temp directory after a delay
      setTimeout(() => {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }, 5000);
      
      // Log download
      await pool.execute(`
        INSERT INTO api_usage_logs (subscription_id, api_key, endpoint, method, ip_address)
        VALUES (?, ?, ?, ?, ?)
      `, [subscription.id, subscription.api_key, '/generate-custom-system', 'POST', req.ip]);
      
    } catch (error) {
      // Clean up temp directory on error
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
      throw error;
    }
    
  } catch (error) {
    console.error('Error generating custom system:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate customized system'
    });
  }
};

/**
 * Sync data from client to server (backup)
 */
exports.syncToServer = async (req, res) => {
  try {
    const { api_key, table_name, data, operation = 'upsert' } = req.body;
    
    if (!api_key || !table_name || !data) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: api_key, table_name, data'
      });
    }
    
    // Verify API key and get subscription info
    const [subscriptions] = await pool.execute(
      `SELECT cs.*, c.email as client_email, s.name as system_name
       FROM client_subscriptions cs
       JOIN clients c ON cs.client_id = c.id
       JOIN systems s ON cs.system_id = s.id
       WHERE cs.api_key = ? AND cs.status IN ('active', 'trial')`,
      [api_key]
    );
    
    if (subscriptions.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or inactive API key'
      });
    }
    
    const subscription = subscriptions[0];
    const remoteDatabaseName = subscription.remote_database_name;
    
    if (!remoteDatabaseName) {
      return res.status(404).json({
        success: false,
        message: 'Remote database not configured for this subscription'
      });
    }
    
    // Sync data to remote database
    const result = await dbSync.syncToRemote(remoteDatabaseName, table_name, data);
    
    res.json({
      success: true,
      message: 'Data synced successfully',
      remote_database: remoteDatabaseName
    });
    
  } catch (error) {
    console.error('Error syncing to server:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync data to server',
      error: error.message
    });
  }
};

/**
 * Sync data from server to client (restore)
 */
exports.syncFromServer = async (req, res) => {
  try {
    const { api_key, table_name, where_clause = {} } = req.body;
    
    if (!api_key || !table_name) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: api_key, table_name'
      });
    }
    
    // Verify API key and get subscription info
    const [subscriptions] = await pool.execute(
      `SELECT cs.*, c.email as client_email, s.name as system_name
       FROM client_subscriptions cs
       JOIN clients c ON cs.client_id = c.id
       JOIN systems s ON cs.system_id = s.id
       WHERE cs.api_key = ? AND cs.status IN ('active', 'trial')`,
      [api_key]
    );
    
    if (subscriptions.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or inactive API key'
      });
    }
    
    const subscription = subscriptions[0];
    const remoteDatabaseName = subscription.remote_database_name;
    
    if (!remoteDatabaseName) {
      return res.status(404).json({
        success: false,
        message: 'Remote database not configured for this subscription'
      });
    }
    
    // Get data from remote database
    const result = await dbSync.syncFromRemote(remoteDatabaseName, table_name, where_clause);
    
    res.json({
      success: true,
      data: result.data,
      count: result.data.length,
      remote_database: remoteDatabaseName
    });
    
  } catch (error) {
    console.error('Error syncing from server:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync data from server',
      error: error.message
    });
  }
};

/**
 * Get all tables from remote database
 */
exports.getRemoteTables = async (req, res) => {
  try {
    const { api_key } = req.query;
    
    if (!api_key) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameter: api_key'
      });
    }
    
    // Verify API key and get subscription info
    const [subscriptions] = await pool.execute(
      `SELECT remote_database_name FROM client_subscriptions
       WHERE api_key = ? AND status IN ('active', 'trial')`,
      [api_key]
    );
    
    if (subscriptions.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or inactive API key'
      });
    }
    
    const remoteDatabaseName = subscriptions[0].remote_database_name;
    
    if (!remoteDatabaseName) {
      return res.status(404).json({
        success: false,
        message: 'Remote database not configured for this subscription'
      });
    }
    
    // Get tables
    const result = await dbSync.getRemoteTables(remoteDatabaseName);
    
    res.json({
      success: true,
      tables: result.tables,
      remote_database: remoteDatabaseName
    });
    
  } catch (error) {
    console.error('Error getting remote tables:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get remote tables',
      error: error.message
    });
  }
};

