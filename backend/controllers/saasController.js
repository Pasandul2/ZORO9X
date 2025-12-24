/**
 * SaaS Controller
 * 
 * Handles all SaaS system management operations
 */

const { pool } = require('../config/database');
const crypto = require('crypto');

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
 * Validate API key and log usage
 */
exports.validateApiKey = async (req, res) => {
  try {
    const { apiKey } = req.body;
    const { ip, headers } = req;
    
    const [subscriptions] = await pool.execute(
      `SELECT cs.*, c.company_name, s.name as system_name
       FROM client_subscriptions cs
       JOIN clients c ON cs.client_id = c.id
       JOIN systems s ON cs.system_id = s.id
       WHERE cs.api_key = ? AND cs.status = 'active'`,
      [apiKey]
    );
    
    if (subscriptions.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or inactive API key'
      });
    }
    
    const subscription = subscriptions[0];
    
    // Log API usage
    await pool.execute(
      `INSERT INTO api_usage_logs 
       (subscription_id, api_key, endpoint, method, ip_address, user_agent) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [subscription.id, apiKey, req.path, req.method, ip, headers['user-agent']]
    );
    
    res.json({
      success: true,
      valid: true,
      subscription: {
        id: subscription.id,
        company_name: subscription.company_name,
        system_name: subscription.system_name,
        database_name: subscription.database_name
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
