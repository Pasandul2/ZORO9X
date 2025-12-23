/**
 * Extended SaaS Database Schema
 * 
 * Additional tables for advanced SaaS features:
 * - Coupons & Discounts
 * - Invoices
 * - Usage Metering
 * - 2FA
 * - Audit Logs
 * - GDPR Compliance
 */

const { pool } = require('./database');

/**
 * Create coupons table - For discount codes
 */
async function createCouponsTable() {
  try {
    const connection = await pool.getConnection();
    
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS coupons (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        type ENUM('percentage', 'fixed_amount') NOT NULL,
        value DECIMAL(10, 2) NOT NULL,
        duration ENUM('once', 'repeating', 'forever') DEFAULT 'once',
        duration_months INT DEFAULT NULL,
        max_redemptions INT DEFAULT NULL,
        times_redeemed INT DEFAULT 0,
        valid_from DATE NOT NULL,
        valid_until DATE NOT NULL,
        applicable_to ENUM('all', 'specific_system', 'specific_plan') DEFAULT 'all',
        system_id INT NULL,
        plan_id INT NULL,
        is_active BOOLEAN DEFAULT true,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (system_id) REFERENCES systems(id) ON DELETE SET NULL,
        FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE SET NULL,
        INDEX idx_code (code),
        INDEX idx_valid_dates (valid_from, valid_until),
        INDEX idx_is_active (is_active)
      )
    `;
    
    await connection.execute(createTableQuery);
    console.log('✅ Coupons table created/verified successfully!');
    connection.release();
    
  } catch (error) {
    console.error('❌ Error creating coupons table:', error.message);
    throw error;
  }
}

/**
 * Create coupon_redemptions table - Track coupon usage
 */
async function createCouponRedemptionsTable() {
  try {
    const connection = await pool.getConnection();
    
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS coupon_redemptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        coupon_id INT NOT NULL,
        subscription_id INT NOT NULL,
        client_id INT NOT NULL,
        discount_amount DECIMAL(10, 2) NOT NULL,
        redeemed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE,
        FOREIGN KEY (subscription_id) REFERENCES client_subscriptions(id) ON DELETE CASCADE,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
        INDEX idx_coupon_id (coupon_id),
        INDEX idx_subscription_id (subscription_id)
      )
    `;
    
    await connection.execute(createTableQuery);
    console.log('✅ Coupon redemptions table created/verified successfully!');
    connection.release();
    
  } catch (error) {
    console.error('❌ Error creating coupon_redemptions table:', error.message);
    throw error;
  }
}

/**
 * Create invoices table - For automated invoicing
 */
async function createInvoicesTable() {
  try {
    const connection = await pool.getConnection();
    
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS invoices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        invoice_number VARCHAR(50) UNIQUE NOT NULL,
        client_id INT NOT NULL,
        subscription_id INT NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        tax_amount DECIMAL(10, 2) DEFAULT 0,
        discount_amount DECIMAL(10, 2) DEFAULT 0,
        total_amount DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'USD',
        status ENUM('draft', 'sent', 'paid', 'overdue', 'cancelled') DEFAULT 'draft',
        issue_date DATE NOT NULL,
        due_date DATE NOT NULL,
        paid_date DATE NULL,
        payment_id INT NULL,
        pdf_url VARCHAR(500),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
        FOREIGN KEY (subscription_id) REFERENCES client_subscriptions(id) ON DELETE CASCADE,
        FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL,
        INDEX idx_invoice_number (invoice_number),
        INDEX idx_client_id (client_id),
        INDEX idx_status (status),
        INDEX idx_due_date (due_date)
      )
    `;
    
    await connection.execute(createTableQuery);
    console.log('✅ Invoices table created/verified successfully!');
    connection.release();
    
  } catch (error) {
    console.error('❌ Error creating invoices table:', error.message);
    throw error;
  }
}

/**
 * Create invoice_items table - Line items for invoices
 */
async function createInvoiceItemsTable() {
  try {
    const connection = await pool.getConnection();
    
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS invoice_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        invoice_id INT NOT NULL,
        description VARCHAR(255) NOT NULL,
        quantity INT DEFAULT 1,
        unit_price DECIMAL(10, 2) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
        INDEX idx_invoice_id (invoice_id)
      )
    `;
    
    await connection.execute(createTableQuery);
    console.log('✅ Invoice items table created/verified successfully!');
    connection.release();
    
  } catch (error) {
    console.error('❌ Error creating invoice_items table:', error.message);
    throw error;
  }
}

/**
 * Create usage_records table - For usage metering
 */
async function createUsageRecordsTable() {
  try {
    const connection = await pool.getConnection();
    
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS usage_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        subscription_id INT NOT NULL,
        metric_name VARCHAR(100) NOT NULL,
        metric_value DECIMAL(15, 2) NOT NULL,
        unit VARCHAR(50),
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        billing_period_start DATE NOT NULL,
        billing_period_end DATE NOT NULL,
        is_billed BOOLEAN DEFAULT false,
        FOREIGN KEY (subscription_id) REFERENCES client_subscriptions(id) ON DELETE CASCADE,
        INDEX idx_subscription_id (subscription_id),
        INDEX idx_billing_period (billing_period_start, billing_period_end),
        INDEX idx_is_billed (is_billed)
      )
    `;
    
    await connection.execute(createTableQuery);
    console.log('✅ Usage records table created/verified successfully!');
    connection.release();
    
  } catch (error) {
    console.error('❌ Error creating usage_records table:', error.message);
    throw error;
  }
}

/**
 * Create usage_limits table - Define usage limits per plan
 */
async function createUsageLimitsTable() {
  try {
    const connection = await pool.getConnection();
    
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS usage_limits (
        id INT AUTO_INCREMENT PRIMARY KEY,
        plan_id INT NOT NULL,
        metric_name VARCHAR(100) NOT NULL,
        limit_value DECIMAL(15, 2) NOT NULL,
        overage_price DECIMAL(10, 2) DEFAULT 0,
        unit VARCHAR(50),
        FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE,
        INDEX idx_plan_id (plan_id),
        UNIQUE KEY unique_plan_metric (plan_id, metric_name)
      )
    `;
    
    await connection.execute(createTableQuery);
    console.log('✅ Usage limits table created/verified successfully!');
    connection.release();
    
  } catch (error) {
    console.error('❌ Error creating usage_limits table:', error.message);
    throw error;
  }
}

/**
 * Create two_factor_auth table - For 2FA
 */
async function createTwoFactorAuthTable() {
  try {
    const connection = await pool.getConnection();
    
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS two_factor_auth (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        user_type ENUM('user', 'admin') NOT NULL,
        secret VARCHAR(255) NOT NULL,
        backup_codes JSON,
        is_enabled BOOLEAN DEFAULT false,
        enabled_at TIMESTAMP NULL,
        last_used_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_type (user_id, user_type),
        INDEX idx_user_id (user_id)
      )
    `;
    
    await connection.execute(createTableQuery);
    console.log('✅ Two-factor auth table created/verified successfully!');
    connection.release();
    
  } catch (error) {
    console.error('❌ Error creating two_factor_auth table:', error.message);
    throw error;
  }
}

/**
 * Create audit_logs table - For compliance and tracking
 */
async function createAuditLogsTable() {
  try {
    const connection = await pool.getConnection();
    
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        user_type ENUM('user', 'admin', 'system') NOT NULL,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50),
        entity_id INT,
        ip_address VARCHAR(45),
        user_agent TEXT,
        changes JSON,
        metadata JSON,
        severity ENUM('info', 'warning', 'error', 'critical') DEFAULT 'info',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_action (action),
        INDEX idx_entity (entity_type, entity_id),
        INDEX idx_created_at (created_at)
      )
    `;
    
    await connection.execute(createTableQuery);
    console.log('✅ Audit logs table created/verified successfully!');
    connection.release();
    
  } catch (error) {
    console.error('❌ Error creating audit_logs table:', error.message);
    throw error;
  }
}

/**
 * Create gdpr_requests table - For data privacy compliance
 */
async function createGdprRequestsTable() {
  try {
    const connection = await pool.getConnection();
    
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS gdpr_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        request_type ENUM('export', 'delete', 'rectify', 'restrict') NOT NULL,
        status ENUM('pending', 'processing', 'completed', 'rejected') DEFAULT 'pending',
        request_details TEXT,
        requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMP NULL,
        processed_by INT NULL,
        export_url VARCHAR(500),
        notes TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_status (status),
        INDEX idx_requested_at (requested_at)
      )
    `;
    
    await connection.execute(createTableQuery);
    console.log('✅ GDPR requests table created/verified successfully!');
    connection.release();
    
  } catch (error) {
    console.error('❌ Error creating gdpr_requests table:', error.message);
    throw error;
  }
}

/**
 * Create rate_limits table - For API rate limiting
 */
async function createRateLimitsTable() {
  try {
    const connection = await pool.getConnection();
    
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS rate_limits (
        id INT AUTO_INCREMENT PRIMARY KEY,
        plan_id INT NOT NULL,
        endpoint_pattern VARCHAR(255) NOT NULL,
        max_requests INT NOT NULL,
        time_window INT NOT NULL COMMENT 'in seconds',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE,
        INDEX idx_plan_id (plan_id)
      )
    `;
    
    await connection.execute(createTableQuery);
    console.log('✅ Rate limits table created/verified successfully!');
    connection.release();
    
  } catch (error) {
    console.error('❌ Error creating rate_limits table:', error.message);
    throw error;
  }
}

/**
 * Create email_templates table - For email notifications
 */
async function createEmailTemplatesTable() {
  try {
    const connection = await pool.getConnection();
    
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS email_templates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        subject VARCHAR(255) NOT NULL,
        body_html TEXT NOT NULL,
        body_text TEXT,
        variables JSON COMMENT 'Available template variables',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_name (name)
      )
    `;
    
    await connection.execute(createTableQuery);
    console.log('✅ Email templates table created/verified successfully!');
    connection.release();
    
  } catch (error) {
    console.error('❌ Error creating email_templates table:', error.message);
    throw error;
  }
}

/**
 * Create email_logs table - Track sent emails
 */
async function createEmailLogsTable() {
  try {
    const connection = await pool.getConnection();
    
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS email_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        template_id INT,
        recipient_email VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        status ENUM('queued', 'sent', 'failed', 'bounced') DEFAULT 'queued',
        error_message TEXT,
        sent_at TIMESTAMP NULL,
        opened_at TIMESTAMP NULL,
        clicked_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (template_id) REFERENCES email_templates(id) ON DELETE SET NULL,
        INDEX idx_recipient (recipient_email),
        INDEX idx_status (status),
        INDEX idx_sent_at (sent_at)
      )
    `;
    
    await connection.execute(createTableQuery);
    console.log('✅ Email logs table created/verified successfully!');
    connection.release();
    
  } catch (error) {
    console.error('❌ Error creating email_logs table:', error.message);
    throw error;
  }
}

/**
 * Alter existing tables to support new features
 */
async function alterExistingTables() {
  try {
    const connection = await pool.getConnection();
    
    // Add trial-related fields to subscription_plans
    await connection.execute(`
      ALTER TABLE subscription_plans 
      ADD COLUMN IF NOT EXISTS trial_days INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS trial_enabled BOOLEAN DEFAULT false
    `).catch(() => console.log('Trial columns may already exist'));
    
    // Add stripe fields to payments
    await connection.execute(`
      ALTER TABLE payments 
      ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS stripe_charge_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS payment_method_details JSON
    `).catch(() => console.log('Stripe columns may already exist'));
    
    // Add stripe fields to client_subscriptions
    await connection.execute(`
      ALTER TABLE client_subscriptions 
      ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS trial_ends_at DATE NULL,
      ADD COLUMN IF NOT EXISTS coupon_id INT NULL,
      ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10, 2) DEFAULT 0
    `).catch(() => console.log('Subscription extension columns may already exist'));
    
    // Add last_login to users table
    await connection.execute(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP NULL,
      ADD COLUMN IF NOT EXISTS last_login_ip VARCHAR(45)
    `).catch(() => console.log('Login tracking columns may already exist'));
    
    console.log('✅ Existing tables altered successfully!');
    connection.release();
    
  } catch (error) {
    console.error('❌ Error altering existing tables:', error.message);
  }
}

/**
 * Seed initial email templates
 */
async function seedEmailTemplates() {
  try {
    const connection = await pool.getConnection();
    
    const templates = [
      {
        name: 'welcome_email',
        subject: 'Welcome to ZORO9X!',
        body_html: '<h1>Welcome {{fullName}}!</h1><p>Thank you for joining ZORO9X. Your account is now active.</p>',
        body_text: 'Welcome {{fullName}}! Thank you for joining ZORO9X.',
        variables: JSON.stringify(['fullName', 'email'])
      },
      {
        name: 'subscription_created',
        subject: 'Subscription Activated - {{systemName}}',
        body_html: '<h1>Subscription Activated!</h1><p>Your subscription to {{systemName}} has been activated.</p><p>API Key: {{apiKey}}</p>',
        body_text: 'Your subscription to {{systemName}} has been activated. API Key: {{apiKey}}',
        variables: JSON.stringify(['systemName', 'planName', 'apiKey', 'price'])
      },
      {
        name: 'payment_receipt',
        subject: 'Payment Receipt - Invoice #{{invoiceNumber}}',
        body_html: '<h1>Payment Received</h1><p>Thank you for your payment of ${{amount}}.</p>',
        body_text: 'Payment received: ${{amount}}. Invoice #{{invoiceNumber}}',
        variables: JSON.stringify(['amount', 'invoiceNumber', 'date'])
      },
      {
        name: 'subscription_expiring',
        subject: 'Your Subscription is Expiring Soon',
        body_html: '<h1>Subscription Expiring</h1><p>Your {{systemName}} subscription expires in {{daysLeft}} days.</p>',
        body_text: 'Your {{systemName}} subscription expires in {{daysLeft}} days.',
        variables: JSON.stringify(['systemName', 'daysLeft', 'renewUrl'])
      },
      {
        name: 'trial_ending',
        subject: 'Your Trial is Ending Soon',
        body_html: '<h1>Trial Ending</h1><p>Your {{systemName}} trial ends in {{daysLeft}} days. Upgrade to continue.</p>',
        body_text: 'Your {{systemName}} trial ends in {{daysLeft}} days.',
        variables: JSON.stringify(['systemName', 'daysLeft', 'upgradeUrl'])
      }
    ];
    
    for (const template of templates) {
      await connection.execute(
        `INSERT INTO email_templates (name, subject, body_html, body_text, variables) 
         VALUES (?, ?, ?, ?, ?) 
         ON DUPLICATE KEY UPDATE subject = ?, body_html = ?, body_text = ?`,
        [
          template.name, template.subject, template.body_html, 
          template.body_text, template.variables,
          template.subject, template.body_html, template.body_text
        ]
      );
    }
    
    console.log('✅ Email templates seeded successfully!');
    connection.release();
    
  } catch (error) {
    console.error('❌ Error seeding email templates:', error.message);
  }
}

/**
 * Initialize all extended tables
 */
async function initializeExtendedTables() {
  try {
    console.log('\n🔄 Initializing extended SaaS tables...\n');
    
    await createCouponsTable();
    await createCouponRedemptionsTable();
    await createInvoicesTable();
    await createInvoiceItemsTable();
    await createUsageRecordsTable();
    await createUsageLimitsTable();
    await createTwoFactorAuthTable();
    await createAuditLogsTable();
    await createGdprRequestsTable();
    await createRateLimitsTable();
    await createEmailTemplatesTable();
    await createEmailLogsTable();
    await alterExistingTables();
    await seedEmailTemplates();
    
    console.log('\n🎉 All extended SaaS tables initialized successfully!\n');
  } catch (error) {
    console.error('❌ Error initializing extended tables:', error.message);
    throw error;
  }
}

module.exports = {
  initializeExtendedTables,
  createCouponsTable,
  createInvoicesTable,
  createUsageRecordsTable,
  createTwoFactorAuthTable,
  createAuditLogsTable,
  createGdprRequestsTable,
  createEmailTemplatesTable
};
