/**
 * SaaS Controller
 * 
 * Handles all SaaS system management operations
 */

const { pool } = require('../config/database');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { spawnSync } = require('child_process');
const securityController = require('./securityController');
const dbSync = require('../utils/databaseSync');
const { generateInstaller } = require('../templates/installerTemplate');

let businessInfoSchemaReady = false;
let renewalSchemaReady = false;

function copyRecursive(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();

  if (!exists) {
    return;
  }

  if (isDirectory) {
    fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursive(path.join(src, childItemName), path.join(dest, childItemName));
    });
    return;
  }

  fs.copyFileSync(src, dest);
}

function updateInstallerSpecDatas(systemFolder) {
  const installerSpecPath = path.join(systemFolder, 'installer.spec');
  if (!fs.existsSync(installerSpecPath)) {
    return;
  }

  const bundledFiles = ['README.md'];
  ['png', 'jpg', 'jpeg', 'gif', 'ico'].forEach((ext) => {
    const logoName = `logo.${ext}`;
    if (fs.existsSync(path.join(systemFolder, logoName))) {
      bundledFiles.push(logoName);
    }
  });

  const datasLine = `    datas=[${bundledFiles
    .filter((fileName) => fs.existsSync(path.join(systemFolder, fileName)))
    .map((fileName) => `('${fileName}', '.')`)
    .join(', ')}],`;

  const specContent = fs.readFileSync(installerSpecPath, 'utf8');
  const updatedContent = specContent.replace(/^[ \t]*datas=.*,$/m, datasLine);
  fs.writeFileSync(installerSpecPath, updatedContent, 'utf8');
}

function readServerApiUrl(systemFolder) {
  const apiUrlFile = path.join(systemFolder, 'server_api_url.txt');
  if (fs.existsSync(apiUrlFile)) {
    return fs.readFileSync(apiUrlFile, 'utf8').trim();
  }
  return process.env.ZORO9X_PUBLIC_API_URL || process.env.ZORO9X_API_URL || '';
}

function findInstallerExecutable(systemFolder) {
  if (!fs.existsSync(systemFolder)) {
    return null;
  }

  const roots = [systemFolder, path.join(systemFolder, 'dist')];
  for (const root of roots) {
    if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
      continue;
    }

    const installer = fs
      .readdirSync(root)
      .find((name) => name.toLowerCase().endsWith('_installer.exe'));

    if (installer) {
      return path.join(root, installer);
    }
  }

  return null;
}

function buildInstallerIfMissing(systemFolder, forceRebuild = false) {
  const existingInstaller = findInstallerExecutable(systemFolder);
  if (existingInstaller && !forceRebuild) {
    return existingInstaller;
  }

  if (process.platform !== 'win32') {
    return null;
  }

  const buildScript = path.join(systemFolder, 'BUILD.bat');
  if (!fs.existsSync(buildScript)) {
    return null;
  }

  console.log(`Installer not found. Attempting build in: ${systemFolder}`);
  updateInstallerSpecDatas(systemFolder);
  const result = spawnSync('cmd.exe', ['/c', 'BUILD.bat'], {
    cwd: systemFolder,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 20,
  });

  if (result.status !== 0) {
    console.error('Installer build failed:', {
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
    });
    return null;
  }

  return findInstallerExecutable(systemFolder);
}

function createZipArchive(sourceDir, outFilePath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outFilePath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => resolve(outFilePath));
    output.on('error', reject);
    archive.on('error', reject);

    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

function parseFeaturesSafely(featuresValue) {
  if (Array.isArray(featuresValue)) {
    return featuresValue;
  }

  if (typeof featuresValue === 'string') {
    try {
      const parsed = JSON.parse(featuresValue || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      // Gracefully handle legacy/non-JSON feature values.
      return featuresValue
        .split(',')
        .map((feature) => feature.trim())
        .filter(Boolean);
    }
  }

  return [];
}

function normalizeFeaturesInput(featuresValue) {
  if (Array.isArray(featuresValue)) {
    return featuresValue.map((feature) => String(feature).trim()).filter(Boolean);
  }

  if (typeof featuresValue === 'string') {
    try {
      const parsed = JSON.parse(featuresValue);
      if (Array.isArray(parsed)) {
        return parsed.map((feature) => String(feature).trim()).filter(Boolean);
      }
    } catch (error) {
      return featuresValue
        .split(/[\n,]/)
        .map((feature) => feature.trim())
        .filter(Boolean);
    }
  }

  return [];
}

async function ensureBusinessInfoSchema() {
  if (businessInfoSchemaReady) {
    return;
  }

  // Add logo_url column if it doesn't exist (MySQL 5.7 compatible)
  try {
    await pool.execute(`
      ALTER TABLE clients
      ADD COLUMN logo_url VARCHAR(500) NULL
    `);
  } catch (err) {
    // Column likely already exists, continue
    if (err.code !== 'ER_DUP_FIELDNAME') {
      console.warn('Warning: Could not add logo_url column:', err.message);
    }
  }

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS business_info_change_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      client_id INT NOT NULL,
      subscription_id INT NOT NULL,
      requested_data LONGTEXT NOT NULL,
      status ENUM('pending','approved','rejected') DEFAULT 'pending',
      admin_note TEXT NULL,
      reviewed_by INT NULL,
      reviewed_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
      FOREIGN KEY (subscription_id) REFERENCES client_subscriptions(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_business_req_client (client_id),
      INDEX idx_business_req_subscription (subscription_id),
      INDEX idx_business_req_status (status)
    )
  `);

  businessInfoSchemaReady = true;
}

async function ensureRenewalSchema() {
  if (renewalSchemaReady) {
    return;
  }

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS subscription_renewal_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      subscription_id INT NOT NULL,
      client_id INT NOT NULL,
      user_id INT NOT NULL,
      amount DECIMAL(10, 2) NOT NULL,
      receipt_url VARCHAR(500) NULL,
      transaction_reference VARCHAR(255) NULL,
      notes TEXT NULL,
      status ENUM('pending','approved','rejected') DEFAULT 'pending',
      payment_id INT NULL,
      admin_note TEXT NULL,
      reviewed_by INT NULL,
      reviewed_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (subscription_id) REFERENCES client_subscriptions(id) ON DELETE CASCADE,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL,
      FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_renew_subscription (subscription_id),
      INDEX idx_renew_status (status),
      INDEX idx_renew_created_at (created_at)
    )
  `);

  renewalSchemaReady = true;
}

function addBillingCycle(baseDateValue, billingCycle) {
  const baseDate = new Date(baseDateValue);
  if (Number.isNaN(baseDate.getTime())) {
    const fallback = new Date();
    return fallback.toISOString().slice(0, 10);
  }

  const normalized = String(billingCycle || '').toLowerCase();
  if (normalized === 'yearly') {
    baseDate.setFullYear(baseDate.getFullYear() + 1);
  } else if (normalized === 'quarterly') {
    baseDate.setMonth(baseDate.getMonth() + 3);
  } else {
    baseDate.setMonth(baseDate.getMonth() + 1);
  }

  return baseDate.toISOString().slice(0, 10);
}

function addDays(baseDateValue, days) {
  const date = new Date(baseDateValue);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function getRenewalCoverageWindow(currentEndDateValue, billingCycle, referenceDateValue = new Date()) {
  const todayIso = new Date(referenceDateValue).toISOString().slice(0, 10);
  const currentEndIso = currentEndDateValue ? new Date(currentEndDateValue).toISOString().slice(0, 10) : null;

  if (currentEndIso && currentEndIso >= todayIso) {
    return {
      payment_period_start: addDays(currentEndIso, 1),
      payment_period_end: addBillingCycle(currentEndIso, billingCycle),
    };
  }

  return {
    payment_period_start: todayIso,
    payment_period_end: addBillingCycle(todayIso, billingCycle),
  };
}

function parseJsonObject(rawValue, fallback = {}) {
  if (!rawValue || typeof rawValue !== 'string') {
    return fallback;
  }

  try {
    const parsed = JSON.parse(rawValue);
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch (error) {
    return fallback;
  }
}

function boolFromValue(value) {
  return value === true || value === 'true' || value === '1' || value === 1;
}

// Export security controller methods
exports.activateDevice = securityController.activateDevice;
exports.validateApiKey = securityController.validateApiKey;
exports.heartbeat = securityController.heartbeat;
exports.getSecurityAlerts = securityController.getSecurityAlerts;
exports.getPendingDevices = securityController.getPendingDevices;
exports.approveDevice = securityController.approveDevice;
exports.rejectDevice = securityController.rejectDevice;
exports.revokeDevice = securityController.revokeDevice;
exports.resolveSecurityAlert = securityController.resolveSecurityAlert;
exports.getSubscriptionDevices = securityController.getSubscriptionDevices;
exports.getClientSubscriptionDevices = securityController.getClientSubscriptionDevices;
exports.getAuditLogs = securityController.getAuditLogs;

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
      features: parseFeaturesSafely(system.features)
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
 * Get all systems for admin (includes inactive)
 */
exports.getAllSystemsAdmin = async (req, res) => {
  try {
    const [systems] = await pool.execute(
      'SELECT * FROM systems ORDER BY category, name'
    );

    const parsedSystems = systems.map(system => ({
      ...system,
      features: parseFeaturesSafely(system.features)
    }));

    res.json({
      success: true,
      systems: parsedSystems
    });
  } catch (error) {
    console.error('Error fetching admin systems:', error);
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
    const { name, description, category, python_file_path, icon_url, features, version } = req.body;
    const normalizedFeatures = normalizeFeaturesInput(features);
    
    const [result] = await pool.execute(
      'INSERT INTO systems (name, description, category, python_file_path, icon_url, features, version) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, description, category, python_file_path, icon_url, JSON.stringify(normalizedFeatures), version || '1.0.0']
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
    const { name, description, category, icon_url, features, status, version, remove_icon } = req.body;

    const [existingRows] = await pool.execute(
      'SELECT icon_url FROM systems WHERE id = ?',
      [id]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'System not found'
      });
    }

    const normalizedFeatures = normalizeFeaturesInput(features);
    const normalizedStatus = String(status || 'active').toLowerCase() === 'inactive' ? 'inactive' : 'active';
    const normalizedVersion = typeof version === 'string' && version.trim() ? version.trim() : '1.0.0';
    const normalizedName = typeof name === 'string' ? name.trim() : '';
    const normalizedDescription = typeof description === 'string' ? description.trim() : '';
    const normalizedCategory = typeof category === 'string' ? category.trim() : '';

    if (!normalizedName || !normalizedDescription || !normalizedCategory) {
      return res.status(400).json({
        success: false,
        message: 'Name, description, and category are required'
      });
    }

    let finalIconUrl = existingRows[0].icon_url || null;
    if (req.file) {
      finalIconUrl = `/uploads/logos/${req.file.filename}`;
    } else if (remove_icon === 'true' || remove_icon === true) {
      finalIconUrl = null;
    } else if (typeof icon_url === 'string' && icon_url.trim()) {
      finalIconUrl = icon_url.trim();
    }
    
    await pool.execute(
      'UPDATE systems SET name = ?, description = ?, category = ?, icon_url = ?, features = ?, status = ?, version = ? WHERE id = ?',
      [normalizedName, normalizedDescription, normalizedCategory, finalIconUrl, JSON.stringify(normalizedFeatures), normalizedStatus, normalizedVersion, id]
    );
    
    res.json({
      success: true,
      message: 'System updated successfully'
    });
  } catch (error) {
    console.error('Error updating system:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update system',
      error: error.message
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
    await ensureBusinessInfoSchema();
    await connection.beginTransaction();
    
    const userId = req.user.id;
    const {
      system_id,
      plan_id,
      company_name,
      contact_email,
      contact_phone,
      business_address,
      website,
      tax_id,
      billing_cycle,
      use_system_logo,
      remove_logo,
    } = req.body;

    const uploadedLogoPath = req.file ? `/uploads/logos/${req.file.filename}` : null;

    const [systemRows] = await connection.execute(
      'SELECT id, icon_url FROM systems WHERE id = ?',
      [system_id]
    );

    if (systemRows.length === 0) {
      throw new Error('System not found');
    }

    let resolvedLogoUrl = uploadedLogoPath;
    if (boolFromValue(use_system_logo)) {
      resolvedLogoUrl = systemRows[0].icon_url || null;
    } else if (boolFromValue(remove_logo)) {
      resolvedLogoUrl = null;
    }
    
    // Check if client exists for this user
    let [clients] = await connection.execute(
      'SELECT id FROM clients WHERE user_id = ?',
      [userId]
    );
    
    let clientId;
    
    if (clients.length === 0) {
      // Create new client
      const [clientResult] = await connection.execute(
        `INSERT INTO clients 
         (user_id, company_name, client_name, email, contact_email, phone, address, website, tax_id, logo_url, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          company_name,
          company_name,
          contact_email,
          contact_email,
          contact_phone,
          business_address || null,
          website || null,
          tax_id || null,
          resolvedLogoUrl,
          'active',
        ]
      );
      clientId = clientResult.insertId;
    } else {
      clientId = clients[0].id;

      await connection.execute(
        `UPDATE clients
         SET company_name = ?, client_name = ?, email = ?, contact_email = ?, phone = ?,
             address = ?, website = ?, tax_id = ?, logo_url = COALESCE(?, logo_url)
         WHERE id = ?`,
        [
          company_name,
          company_name,
          contact_email,
          contact_email,
          contact_phone,
          business_address || null,
          website || null,
          tax_id || null,
          resolvedLogoUrl,
          clientId,
        ]
      );
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
    
    const effectiveBillingCycle = billing_cycle || plan.billing_cycle || 'monthly';

    switch (effectiveBillingCycle) {
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
    await ensureRenewalSchema();
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
        c.company_name,
        c.contact_email,
        c.phone as contact_phone,
        c.address as business_address,
        c.website,
        c.tax_id,
        c.logo_url
       FROM client_subscriptions cs
       JOIN clients c ON cs.client_id = c.id
       JOIN systems s ON cs.system_id = s.id
       JOIN subscription_plans sp ON cs.plan_id = sp.id
       WHERE c.user_id = ?
       ORDER BY cs.created_at DESC`,
      [userId]
    );
    
    const now = new Date();
    const enriched = subscriptions.map((subscription) => {
      const endDate = subscription.end_date ? new Date(subscription.end_date) : null;
      const daysRemaining = endDate
        ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      const needsRenewal =
        subscription.status === 'expired' ||
        subscription.status === 'cancelled' ||
        (typeof daysRemaining === 'number' && daysRemaining <= 7);

      return {
        ...subscription,
        days_remaining: daysRemaining,
        renewal_recommended: needsRenewal,
        renewal_message: needsRenewal
          ? (
              subscription.status === 'expired'
                ? 'Subscription expired. Renew now to restore full access.'
                : subscription.status === 'cancelled'
                  ? 'Subscription is inactive. Renew now to reactivate.'
                  : `Subscription ends in ${Math.max(daysRemaining || 0, 0)} day(s). Renew soon.`
            )
          : null,
      };
    });

    res.json({
      success: true,
      subscriptions: enriched,
      bank_details: {
        account_no: '2002342027',
        account_name: 'Pamith Pasandul',
        bank_name: 'HNB',
      },
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
 * Get business info and latest change request status for a subscription (Client)
 */
exports.getBusinessInfoForSubscription = async (req, res) => {
  try {
    await ensureBusinessInfoSchema();

    const { subscriptionId } = req.params;
    const userId = req.user.id;

    const [rows] = await pool.execute(
      `SELECT 
        cs.id as subscription_id,
        cs.system_id,
        c.id as client_id,
        c.company_name,
        c.contact_email,
        c.phone as contact_phone,
        c.address as business_address,
        c.website,
        c.tax_id,
        c.logo_url,
        s.icon_url as system_logo
       FROM client_subscriptions cs
       JOIN clients c ON cs.client_id = c.id
       JOIN systems s ON cs.system_id = s.id
       WHERE cs.id = ? AND c.user_id = ?`,
      [subscriptionId, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    const [latestRequestRows] = await pool.execute(
      `SELECT id, status, admin_note, created_at, reviewed_at
       FROM business_info_change_requests
       WHERE subscription_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [subscriptionId]
    );

    res.json({
      success: true,
      businessInfo: rows[0],
      latestRequest: latestRequestRows[0] || null,
    });
  } catch (error) {
    console.error('Error fetching business info:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch business info' });
  }
};

/**
 * Submit business information change request (Client)
 */
exports.requestBusinessInfoUpdate = async (req, res) => {
  try {
    await ensureBusinessInfoSchema();

    const { subscriptionId } = req.params;
    const userId = req.user.id;

    const [rows] = await pool.execute(
      `SELECT 
        cs.id as subscription_id,
        cs.system_id,
        c.id as client_id,
        c.company_name,
        c.contact_email,
        c.phone as contact_phone,
        c.address as business_address,
        c.website,
        c.tax_id,
        c.logo_url
       FROM client_subscriptions cs
       JOIN clients c ON cs.client_id = c.id
       WHERE cs.id = ? AND c.user_id = ?`,
      [subscriptionId, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    const [pendingRows] = await pool.execute(
      `SELECT id FROM business_info_change_requests
       WHERE subscription_id = ? AND status = 'pending'
       LIMIT 1`,
      [subscriptionId]
    );

    if (pendingRows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending business info change request',
      });
    }

    const existing = rows[0];
    const {
      company_name,
      contact_email,
      contact_phone,
      business_address,
      website,
      tax_id,
      use_system_logo,
      remove_logo,
    } = req.body;

    const [systemRows] = await pool.execute(
      'SELECT icon_url FROM systems WHERE id = ?',
      [existing.system_id]
    );

    let logoUrl = existing.logo_url || null;
    if (req.file) {
      logoUrl = `/uploads/logos/${req.file.filename}`;
    } else if (boolFromValue(use_system_logo)) {
      logoUrl = systemRows[0]?.icon_url || null;
    } else if (boolFromValue(remove_logo)) {
      logoUrl = null;
    }

    const requestedData = {
      company_name: (company_name || '').trim(),
      contact_email: (contact_email || '').trim(),
      contact_phone: (contact_phone || '').trim(),
      business_address: (business_address || '').trim(),
      website: (website || '').trim(),
      tax_id: (tax_id || '').trim(),
      logo_url: logoUrl,
    };

    if (!requestedData.company_name || !requestedData.contact_email || !requestedData.contact_phone) {
      return res.status(400).json({
        success: false,
        message: 'Company name, contact email and contact phone are required',
      });
    }

    await pool.execute(
      `INSERT INTO business_info_change_requests
       (client_id, subscription_id, requested_data, status)
       VALUES (?, ?, ?, 'pending')`,
      [existing.client_id, subscriptionId, JSON.stringify(requestedData)]
    );

    await pool.execute(
      `INSERT INTO audit_logs (subscription_id, event_type, actor, details, ip_address)
       VALUES (?, 'business_info_change_requested', ?, ?, ?)`,
      [
        subscriptionId,
        String(userId),
        JSON.stringify({ message: 'Client requested business information update approval.' }),
        req.ip,
      ]
    );

    res.json({ success: true, message: 'Business information update request submitted for admin approval' });
  } catch (error) {
    console.error('Error requesting business info update:', error);
    res.status(500).json({ success: false, message: 'Failed to submit business info update request' });
  }
};

/**
 * Get business information change requests (Admin)
 */
exports.getBusinessInfoRequests = async (req, res) => {
  try {
    await ensureBusinessInfoSchema();

    const status = (req.query.status || 'pending').toString();
    const allowedStatuses = ['pending', 'approved', 'rejected', 'all'];
    const filterStatus = allowedStatuses.includes(status) ? status : 'pending';

    const query = `SELECT 
      br.*,
      c.company_name as current_company_name,
      c.contact_email as current_contact_email,
      c.phone as current_contact_phone,
      c.address as current_business_address,
      c.website as current_website,
      c.tax_id as current_tax_id,
      c.logo_url as current_logo_url,
      s.name as system_name,
      u.email as requested_by_email
     FROM business_info_change_requests br
     JOIN clients c ON br.client_id = c.id
     JOIN client_subscriptions cs ON br.subscription_id = cs.id
     JOIN systems s ON cs.system_id = s.id
     LEFT JOIN users u ON c.user_id = u.id
     ${filterStatus === 'all' ? '' : 'WHERE br.status = ?'}
     ORDER BY CASE WHEN br.status = 'pending' THEN 0 ELSE 1 END, br.created_at DESC`;

    const [rows] = filterStatus === 'all'
      ? await pool.execute(query)
      : await pool.execute(query, [filterStatus]);

    const parsedRows = rows.map((row) => ({
      ...row,
      requested_data: parseJsonObject(row.requested_data, {}),
    }));

    const [countRows] = await pool.execute(
      `SELECT status, COUNT(*) as count
       FROM business_info_change_requests
       GROUP BY status`
    );

    const counts = countRows.reduce((acc, row) => {
      acc[row.status] = Number(row.count || 0);
      return acc;
    }, { pending: 0, approved: 0, rejected: 0 });

    res.json({ success: true, requests: parsedRows, counts });
  } catch (error) {
    console.error('Error fetching business info requests:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch business info requests' });
  }
};

/**
 * Approve or reject business information change request (Admin)
 */
exports.reviewBusinessInfoRequest = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await ensureBusinessInfoSchema();
    await connection.beginTransaction();

    const { requestId } = req.params;
    const { action, admin_note } = req.body;
    const adminUserId = req.user.id;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid action' });
    }

    const [requestRows] = await connection.execute(
      `SELECT * FROM business_info_change_requests WHERE id = ? FOR UPDATE`,
      [requestId]
    );

    if (requestRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    const request = requestRows[0];
    if (request.status !== 'pending') {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'This request has already been reviewed' });
    }

    const nextStatus = action === 'approve' ? 'approved' : 'rejected';

    await connection.execute(
      `UPDATE business_info_change_requests
       SET status = ?, admin_note = ?, reviewed_by = ?, reviewed_at = NOW()
       WHERE id = ?`,
      [nextStatus, admin_note || null, adminUserId, requestId]
    );

    const requestedData = parseJsonObject(request.requested_data, {});

    if (action === 'approve') {
      await connection.execute(
        `UPDATE clients
         SET company_name = ?, client_name = ?, email = ?, contact_email = ?, phone = ?,
             address = ?, website = ?, tax_id = ?, logo_url = ?
         WHERE id = ?`,
        [
          requestedData.company_name || '',
          requestedData.company_name || '',
          requestedData.contact_email || '',
          requestedData.contact_email || '',
          requestedData.contact_phone || '',
          requestedData.business_address || null,
          requestedData.website || null,
          requestedData.tax_id || null,
          requestedData.logo_url || null,
          request.client_id,
        ]
      );
    }

    await connection.execute(
      `INSERT INTO audit_logs (subscription_id, event_type, actor, details, ip_address)
       VALUES (?, ?, ?, ?, ?)`,
      [
        request.subscription_id,
        action === 'approve' ? 'business_info_change_approved' : 'business_info_change_rejected',
        String(adminUserId),
        JSON.stringify({ message: admin_note || (action === 'approve' ? 'Approved by admin' : 'Rejected by admin') }),
        req.ip,
      ]
    );

    await connection.commit();

    res.json({ success: true, message: `Business info change request ${nextStatus}` });
  } catch (error) {
    await connection.rollback();
    console.error('Error reviewing business info request:', error);
    res.status(500).json({ success: false, message: 'Failed to review business info request' });
  } finally {
    connection.release();
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
       LEFT JOIN users u ON c.user_id = u.id
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
    
    // Get active device metrics from device activations
    const [deviceStats] = await pool.execute(
      `SELECT COUNT(*) as active_count, MAX(last_seen) as last_seen
       FROM device_activations
       WHERE subscription_id = ? AND status = 'active'`,
      [subscriptionId]
    );
    
    const [recentPayments] = await pool.execute(
      `SELECT status, payment_date
       FROM payments
       WHERE subscription_id = ?
       ORDER BY payment_date DESC, id DESC
       LIMIT 1`,
      [subscriptionId]
    );

    const paymentStatus = recentPayments.length > 0 ? recentPayments[0].status : 'completed';
    const todayIso = new Date().toISOString().slice(0, 10);
    const subscriptionEndIso = subscription.end_date ? new Date(subscription.end_date).toISOString().slice(0, 10) : null;
    const isCurrentlyActive = subscription.status === 'active' && (!subscriptionEndIso || subscriptionEndIso >= todayIso);
    const effectivePaymentStatus = isCurrentlyActive && paymentStatus !== 'completed' ? 'completed' : paymentStatus;
    const heartbeatWindowMinutes = Math.max(
      1,
      parseInt(process.env.ONLINE_HEARTBEAT_WINDOW_MINUTES || process.env.OFFLINE_GRACE_MINUTES || '3', 10)
    );
    const gracePeriodMinutes = Math.max(
      1,
      parseInt(process.env.OFFLINE_GRACE_MINUTES || '3', 10)
    );
    const gracePeriodDays = Math.max(1, Math.ceil(gracePeriodMinutes / (60 * 24)));

    let onlineStatus = false;
    let offlineMinutes = null;
    if (deviceStats[0]?.last_seen) {
      const lastSeenTime = new Date(deviceStats[0].last_seen).getTime();
      const nowTime = Date.now();
      const diffMinutes = Math.floor((nowTime - lastSeenTime) / (1000 * 60));
      offlineMinutes = Math.max(diffMinutes, 0);
      onlineStatus = diffMinutes <= heartbeatWindowMinutes;
    }

    res.json({
      success: true,
      security: {
        device_count: Number(deviceStats[0]?.active_count || 0),
        max_devices: subscription.max_devices || subscription.max_activations || 3,
        activation_count: subscription.activation_count || 0,
        max_activations: subscription.max_activations || 3,
        is_activated: subscription.is_activated || false,
        last_seen: deviceStats[0]?.last_seen || null,
        online_status: onlineStatus,
        offline_minutes: offlineMinutes,
        heartbeat_window_minutes: heartbeatWindowMinutes,
        grace_period_minutes: gracePeriodMinutes,
        grace_period_days: gracePeriodDays,
        subscription_status: subscription.status,
        payment_status: effectivePaymentStatus,
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
 * Submit renewal request with bank transfer receipt (Client)
 */
exports.submitRenewalRequest = async (req, res) => {
  try {
    await ensureRenewalSchema();

    const { subscriptionId } = req.params;
    const userId = req.user.id;
    const { transaction_reference, notes } = req.body;

    const [subs] = await pool.execute(
      `SELECT cs.id, cs.client_id, cs.status, cs.total_amount, cs.end_date, sp.price, sp.billing_cycle
       FROM client_subscriptions cs
       JOIN clients c ON c.id = cs.client_id
       JOIN subscription_plans sp ON sp.id = cs.plan_id
       WHERE cs.id = ? AND c.user_id = ?
       LIMIT 1`,
      [subscriptionId, userId]
    );

    if (subs.length === 0) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    const subscription = subs[0];
    const [pending] = await pool.execute(
      `SELECT id FROM subscription_renewal_requests
       WHERE subscription_id = ? AND status = 'pending'
       LIMIT 1`,
      [subscriptionId]
    );

    if (pending.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'A renewal request is already pending review for this subscription.'
      });
    }

    const amount = Number(subscription.price || subscription.total_amount || 0);
    const receiptPath = req.file ? `/uploads/receipts/${req.file.filename}` : null;

    const [requestResult] = await pool.execute(
      `INSERT INTO subscription_renewal_requests
       (subscription_id, client_id, user_id, amount, receipt_url, transaction_reference, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        subscriptionId,
        subscription.client_id,
        userId,
        amount,
        receiptPath,
        transaction_reference || null,
        notes || null,
      ]
    );

    const [paymentResult] = await pool.execute(
      `INSERT INTO payments (client_id, subscription_id, amount, payment_method, transaction_id, status, notes)
       VALUES (?, ?, ?, 'bank_transfer', ?, 'pending', ?)`,
      [
        subscription.client_id,
        subscriptionId,
        amount,
        transaction_reference || `renew-${subscriptionId}-${Date.now()}`,
        `Renewal request #${requestResult.insertId}`,
      ]
    );

    await pool.execute(
      `UPDATE subscription_renewal_requests
       SET payment_id = ?
       WHERE id = ?`,
      [paymentResult.insertId, requestResult.insertId]
    );

    await pool.execute(
      `INSERT INTO system_notifications (client_id, subscription_id, title, message, type)
       VALUES (?, ?, ?, ?, 'info')`,
      [
        subscription.client_id,
        subscriptionId,
        'Renewal Request Submitted',
        'Your bank transfer renewal request was submitted and is pending admin review.',
      ]
    );

    return res.json({
      success: true,
      message: 'Renewal request submitted successfully',
      request_id: requestResult.insertId,
    });
  } catch (error) {
    console.error('Error submitting renewal request:', error);
    return res.status(500).json({ success: false, message: 'Failed to submit renewal request' });
  }
};

/**
 * Get renewal requests for a subscription (Client)
 */
exports.getSubscriptionRenewalRequests = async (req, res) => {
  try {
    await ensureRenewalSchema();
    const { subscriptionId } = req.params;
    const userId = req.user.id;

    const [owned] = await pool.execute(
      `SELECT cs.id
       FROM client_subscriptions cs
       JOIN clients c ON c.id = cs.client_id
       WHERE cs.id = ? AND c.user_id = ?
       LIMIT 1`,
      [subscriptionId, userId]
    );

    if (owned.length === 0) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    const [requests] = await pool.execute(
      `SELECT rr.id, rr.amount, rr.receipt_url, rr.transaction_reference, rr.notes, rr.status, rr.admin_note, rr.created_at, rr.reviewed_at,
              cs.end_date, sp.billing_cycle
       FROM subscription_renewal_requests rr
       JOIN client_subscriptions cs ON cs.id = rr.subscription_id
       JOIN subscription_plans sp ON sp.id = cs.plan_id
       WHERE rr.subscription_id = ?
       ORDER BY rr.created_at DESC
       LIMIT 20`,
      [subscriptionId]
    );

    const withPeriods = requests.map((request) => ({
      ...request,
      ...getRenewalCoverageWindow(request.end_date, request.billing_cycle, request.created_at),
    }));

    return res.json({ success: true, requests: withPeriods });
  } catch (error) {
    console.error('Error fetching renewal requests:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch renewal requests' });
  }
};

/**
 * Admin: list renewal requests
 */
exports.getRenewalRequestsAdmin = async (req, res) => {
  try {
    await ensureRenewalSchema();
    const status = (req.query.status || 'all').toString();

    let whereClause = '';
    const params = [];
    if (status !== 'all') {
      whereClause = 'WHERE rr.status = ?';
      params.push(status);
    }

    const [requests] = await pool.execute(
      `SELECT rr.*, c.company_name, u.email as user_email, s.name as system_name, cs.end_date, sp.billing_cycle
       FROM subscription_renewal_requests rr
       JOIN clients c ON c.id = rr.client_id
       JOIN users u ON u.id = rr.user_id
       JOIN client_subscriptions cs ON cs.id = rr.subscription_id
       JOIN systems s ON s.id = cs.system_id
       JOIN subscription_plans sp ON sp.id = cs.plan_id
       ${whereClause}
       ORDER BY rr.created_at DESC`,
      params
    );

    const withPeriods = requests.map((request) => ({
      ...request,
      ...getRenewalCoverageWindow(request.end_date, request.billing_cycle, request.created_at),
    }));

    return res.json({ success: true, requests: withPeriods });
  } catch (error) {
    console.error('Error fetching admin renewal requests:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch renewal requests' });
  }
};

/**
 * Admin: review renewal request (approve/reject)
 */
exports.reviewRenewalRequestAdmin = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await ensureRenewalSchema();
    const { requestId } = req.params;
    const adminId = req.user.id;
    const action = String(req.body.action || '').toLowerCase();
    const adminNote = req.body.admin_note || null;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid action' });
    }

    await connection.beginTransaction();

    const [rows] = await connection.execute(
      `SELECT rr.*, cs.end_date, cs.client_id, cs.id as subscription_id, cs.status as subscription_status,
              sp.billing_cycle
       FROM subscription_renewal_requests rr
       JOIN client_subscriptions cs ON cs.id = rr.subscription_id
       JOIN subscription_plans sp ON sp.id = cs.plan_id
       WHERE rr.id = ?
       LIMIT 1 FOR UPDATE`,
      [requestId]
    );

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Renewal request not found' });
    }

    const reqRow = rows[0];
    if (reqRow.status !== 'pending') {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Request already reviewed' });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    await connection.execute(
      `UPDATE subscription_renewal_requests
       SET status = ?, admin_note = ?, reviewed_at = NOW()
       WHERE id = ?`,
      [newStatus, adminNote, requestId]
    );

    if (reqRow.payment_id) {
      await connection.execute(
        `UPDATE payments
         SET status = ?, notes = CONCAT(COALESCE(notes, ''), ' | reviewed:', ?)
         WHERE id = ?`,
        [action === 'approve' ? 'completed' : 'failed', action, reqRow.payment_id]
      );
    }

    if (action === 'approve') {
      const todayIso = new Date().toISOString().slice(0, 10);
      const baseDate = reqRow.end_date && reqRow.end_date > todayIso ? reqRow.end_date : todayIso;
      const newEndDate = addBillingCycle(baseDate, reqRow.billing_cycle);
      const coverage = getRenewalCoverageWindow(reqRow.end_date, reqRow.billing_cycle, new Date());

      await connection.execute(
        `UPDATE client_subscriptions
         SET status = 'active',
             start_date = CASE WHEN start_date IS NULL THEN ? ELSE start_date END,
             end_date = ?,
             next_billing_date = ?,
             last_payment_date = NOW(),
             updated_at = NOW()
         WHERE id = ?`,
        [todayIso, newEndDate, newEndDate, reqRow.subscription_id]
      );

      await connection.execute(
        `INSERT INTO system_notifications (client_id, subscription_id, title, message, type)
         VALUES (?, ?, ?, ?, 'success')`,
        [
          reqRow.client_id,
          reqRow.subscription_id,
          'Renewal Approved',
          `Your renewal was approved. Coverage: ${coverage.payment_period_start} to ${coverage.payment_period_end}. Subscription is active until ${newEndDate}.`,
        ]
      );
    } else {
      await connection.execute(
        `INSERT INTO system_notifications (client_id, subscription_id, title, message, type)
         VALUES (?, ?, ?, ?, 'warning')`,
        [
          reqRow.client_id,
          reqRow.subscription_id,
          'Renewal Rejected',
          'Your renewal request was rejected. Please contact support or resubmit with a valid receipt.',
        ]
      );
    }

    await connection.commit();
    return res.json({ success: true, message: `Renewal request ${newStatus}` });
  } catch (error) {
    await connection.rollback();
    console.error('Error reviewing renewal request:', error);
    return res.status(500).json({ success: false, message: 'Failed to review renewal request' });
  } finally {
    connection.release();
  }
};

/**
 * Admin: list all subscriptions for lifecycle management
 */
exports.getAllSubscriptionsAdmin = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT cs.id, cs.status, cs.start_date, cs.end_date, cs.auto_renew, cs.next_billing_date,
              cs.device_count, cs.max_devices, cs.max_activations, cs.activation_count,
              c.company_name, u.email as user_email, s.name as system_name, sp.name as plan_name, sp.billing_cycle
       FROM client_subscriptions cs
       JOIN clients c ON c.id = cs.client_id
       JOIN users u ON u.id = c.user_id
       JOIN systems s ON s.id = cs.system_id
       JOIN subscription_plans sp ON sp.id = cs.plan_id
       ORDER BY cs.updated_at DESC, cs.id DESC`
    );

    return res.json({ success: true, subscriptions: rows });
  } catch (error) {
    console.error('Error fetching admin subscriptions:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch subscriptions' });
  }
};

/**
 * Admin: set subscription status (active/cancelled/expired)
 */
exports.setSubscriptionStatusAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;
    const allowed = ['active', 'cancelled', 'expired'];

    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    const [subs] = await pool.execute(
      `SELECT id, client_id
       FROM client_subscriptions
       WHERE id = ?
       LIMIT 1`,
      [id]
    );

    if (subs.length === 0) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    await pool.execute(
      `UPDATE client_subscriptions
       SET status = ?, updated_at = NOW()
       WHERE id = ?`,
      [status, id]
    );

    await pool.execute(
      `INSERT INTO system_notifications (client_id, subscription_id, title, message, type)
       VALUES (?, ?, ?, ?, ?)`,
      [
        subs[0].client_id,
        id,
        `Subscription ${status}`,
        note || `Your subscription status was updated to ${status} by administrator.`,
        status === 'active' ? 'success' : 'warning',
      ]
    );

    return res.json({ success: true, message: 'Subscription status updated' });
  } catch (error) {
    console.error('Error setting subscription status:', error);
    return res.status(500).json({ success: false, message: 'Failed to update subscription status' });
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
    await ensureBusinessInfoSchema();

    const { subscriptionId } = req.params;
    const userId = req.user.id;
    
    // Verify subscription belongs to user and is active.
    // If the requested ID is stale, gracefully fall back to the latest active subscription.
    let [subscriptions] = await pool.execute(`
            SELECT cs.*, s.name as system_name, s.python_file_path, s.icon_url as system_logo,
              s.category, s.features as system_features, sp.name as plan_name,
              c.company_name, c.contact_email, c.phone as contact_phone, c.address as business_address,
              c.website, c.tax_id, c.logo_url
      FROM client_subscriptions cs
      JOIN clients c ON cs.client_id = c.id
      JOIN systems s ON cs.system_id = s.id
      JOIN subscription_plans sp ON cs.plan_id = sp.id
      WHERE cs.id = ? AND c.user_id = ? AND cs.status = 'active'
      LIMIT 1
    `, [subscriptionId, userId]);

    if (subscriptions.length === 0) {
      [subscriptions] = await pool.execute(`
              SELECT cs.*, s.name as system_name, s.python_file_path, s.icon_url as system_logo,
                s.category, s.features as system_features, sp.name as plan_name,
                c.company_name, c.contact_email, c.phone as contact_phone, c.address as business_address,
                c.website, c.tax_id, c.logo_url
        FROM client_subscriptions cs
        JOIN clients c ON cs.client_id = c.id
        JOIN systems s ON cs.system_id = s.id
        JOIN subscription_plans sp ON cs.plan_id = sp.id
        WHERE c.user_id = ? AND cs.status = 'active'
        ORDER BY cs.id DESC
        LIMIT 1
      `, [userId]);
    }

    if (subscriptions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No active subscription found for download'
      });
    }

    const subscription = subscriptions[0];
    
    // Determine tier from plan name
    const tier = subscription.plan_name.toLowerCase().includes('premium') ? 'premium' : 'basic';
    
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

    const safeSystemName = (subscription.system_name || 'system').replace(/\s+/g, '_');
    const installerFilename = `${safeSystemName}_${tier}_installer.exe`;
    let downloadName = installerFilename;

    const tempRoot = path.join(__dirname, '../uploads/temp');
    fs.mkdirSync(tempRoot, { recursive: true });
    const packageDir = path.join(tempRoot, `download_${subscription.id}_${Date.now()}`);
    fs.mkdirSync(packageDir, { recursive: true });

    copyRecursive(systemFolder, packageDir);

    const sensitiveArtifacts = ['business_config.json'];
    for (const artifact of sensitiveArtifacts) {
      const artifactPath = path.join(packageDir, artifact);
      if (fs.existsSync(artifactPath)) {
        fs.rmSync(artifactPath, { force: true });
      }
    }

    const categoryFromPath = cleanPath.split('/').filter(Boolean)[0] || 'system';
    const sanitizedCategory = String(subscription.category || categoryFromPath)
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_');

    const installerSource = generateInstaller({
      systemName: subscription.system_name || 'Business System',
      category: sanitizedCategory,
      features: parseFeaturesSafely(subscription.system_features),
      tier,
      apiUrl: readServerApiUrl(packageDir),
    });


    fs.writeFileSync(path.join(packageDir, 'installer.py'), installerSource, 'utf8');

    // Always rebuild from the packaged source so downloads reflect the latest code/assets.
    let installerPath = buildInstallerIfMissing(packageDir, true);
    
    let downloadPath = installerPath;
    let deliveryMode = 'exe';
    const cleanupPaths = [packageDir];

    if (!installerPath) {
      const zipName = `${safeSystemName}_${tier}_system.zip`;
      const zipPath = path.join(tempRoot, `download_${subscription.id}_${Date.now()}.zip`);
      await createZipArchive(packageDir, zipPath);
      downloadPath = zipPath;
      downloadName = zipName;
      deliveryMode = 'zip';
      cleanupPaths.push(zipPath);
    } else if (!installerPath.startsWith(packageDir)) {
      // If using source installer, copy it to package dir for cleanup.
      const destPath = path.join(packageDir, path.basename(installerPath));
      fs.copyFileSync(installerPath, destPath);
      installerPath = destPath;
      downloadPath = installerPath;
    }

    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
      'Surrogate-Control': 'no-store',
    });

    return res.download(downloadPath, downloadName, async (downloadError) => {
      try {
        cleanupPaths.forEach((cleanupPath) => {
          if (!fs.existsSync(cleanupPath)) {
            return;
          }
          const stat = fs.statSync(cleanupPath);
          if (stat.isDirectory()) {
            fs.rmSync(cleanupPath, { recursive: true, force: true });
          } else {
            fs.rmSync(cleanupPath, { force: true });
          }
        });
      } catch (cleanupError) {
        console.error('Failed to cleanup installer package temp directory:', cleanupError);
      }

      if (downloadError) {
        console.error('Error sending installer executable:', downloadError);
        if (!res.headersSent) {
          res.status(500).json({ success: false, message: 'Failed to download installer executable' });
        }
        return;
      }

      try {
        await pool.execute(
          `INSERT INTO api_usage_logs (subscription_id, api_key, endpoint, method, ip_address)
           VALUES (?, ?, ?, ?, ?)`,
          [subscription.id, subscription.api_key, '/download', 'GET', req.ip]
        );

        await pool.execute(
          `INSERT INTO audit_logs (subscription_id, event_type, actor, details, ip_address)
           VALUES (?, 'download', ?, ?, ?)`,
          [
            subscription.id,
            String(req.user?.id || 'client'),
            JSON.stringify({
              filename: downloadName,
              system_name: subscription.system_name,
              plan: subscription.plan_name,
              includes_business_info: false,
              delivery: deliveryMode,
              config_mode: 'api_key_online_fetch',
            }),
            req.ip,
          ]
        );
      } catch (logError) {
        console.error('Failed to log installer download:', logError);
      }
    });
    
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
      
      // Ensure requirements.txt exists in tempDir (safety fallback)
      const reqPath = path.join(tempDir, 'requirements.txt');
      if (!fs.existsSync(reqPath)) {
        fs.writeFileSync(reqPath, 'requests\nPillow\n');
      }
      
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
cd /d "%~dp0"
echo.
echo ================================================
echo    ${business_name}
echo    System Installation Wizard
echo ================================================
echo.
if exist "%~dp0dist\*_installer.exe" (
  echo Found installer executable. Starting setup...
  echo.
  for %%f in ("%~dp0dist\*_installer.exe") do start "" "%%f"
  exit /b 0
)

if exist "%~dp0*_installer.exe" (
  echo Found installer executable. Starting setup...
  echo.
  for %%f in ("%~dp0*_installer.exe") do start "" "%%f"
  exit /b 0
)

echo Installer executable not found. Falling back to Python installer...
echo.

python --version >nul 2>&1
if %errorlevel% neq 0 (
  echo ERROR: Python is not installed and installer EXE is not available.
  echo.
  echo Please request the installer EXE package from support.
  echo.
  pause
  exit /b 1
)

python "%~dp0installer.py"

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
1. **Double-click** \`INSTALL.bat\` (or run \`*_installer.exe\` directly)
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
      
      let installerPath = buildInstallerIfMissing(tempDir, true);
      if (!installerPath) {
        throw new Error('Installer executable not found. Please build installer before download.');
      }

      const downloadName = `${subscription.system_name}_${tier}_installer.exe`.replace(/\s+/g, '_');

      return res.download(installerPath, downloadName, async (downloadError) => {
        try {
          fs.rmSync(tempDir, { recursive: true, force: true });
        } catch (cleanupError) {
          console.error('Failed to clean temp directory:', cleanupError);
        }

        if (downloadError) {
          console.error('Error sending custom installer:', downloadError);
          if (!res.headersSent) {
            res.status(500).json({
              success: false,
              message: 'Failed to download custom installer'
            });
          }
          return;
        }

        try {
          await pool.execute(`
            INSERT INTO api_usage_logs (subscription_id, api_key, endpoint, method, ip_address)
            VALUES (?, ?, ?, ?, ?)
          `, [subscription.id, subscription.api_key, '/generate-custom-system', 'POST', req.ip]);
          await pool.execute(
            `INSERT INTO audit_logs (subscription_id, event_type, actor, details, ip_address)
             VALUES (?, 'download', ?, ?, ?)`,
            [
              subscription.id,
              String(req.user?.id || 'client'),
              JSON.stringify({
                filename: downloadName,
                system_name: subscription.system_name,
                plan: subscription.plan_name,
                customized: true,
                business_name,
              }),
              req.ip,
            ]
          );
        } catch (logError) {
          console.error('Failed to log custom installer download:', logError);
        }
      });
      
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

