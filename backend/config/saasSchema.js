/**
 * SaaS Database Schema Configuration
 * 
 * Defines database tables for SaaS system management
 */

const { pool } = require('./database');

/**
 * Create systems table - Stores available SaaS systems (Gym, Restaurant, etc.)
 */
async function createSystemsTable() {
  try {
    const connection = await pool.getConnection();
    
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS systems (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        version VARCHAR(50) DEFAULT '1.0.0',
        python_file_path VARCHAR(500),
        icon_url VARCHAR(500),
        features JSON,
        status ENUM('active', 'inactive', 'maintenance') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_category (category),
        INDEX idx_status (status)
      )
    `;
    
    await connection.execute(createTableQuery);
    console.log('✅ Systems table created/verified successfully!');
    connection.release();
    
  } catch (error) {
    console.error('❌ Error creating systems table:', error.message);
    throw error;
  }
}

/**
 * Create subscription_plans table - Stores pricing plans for systems
 */
async function createSubscriptionPlansTable() {
  try {
    const connection = await pool.getConnection();
    
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id INT AUTO_INCREMENT PRIMARY KEY,
        system_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10, 2) NOT NULL,
        billing_cycle ENUM('monthly', 'quarterly', 'yearly') NOT NULL,
        features JSON,
        max_users INT DEFAULT 10,
        max_storage_gb INT DEFAULT 5,
        support_level ENUM('basic', 'standard', 'premium') DEFAULT 'basic',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (system_id) REFERENCES systems(id) ON DELETE CASCADE,
        INDEX idx_system_id (system_id),
        INDEX idx_is_active (is_active)
      )
    `;
    
    await connection.execute(createTableQuery);
    console.log('✅ Subscription plans table created/verified successfully!');
    connection.release();
    
  } catch (error) {
    console.error('❌ Error creating subscription_plans table:', error.message);
    throw error;
  }
}

/**
 * Create clients table - Stores clients who purchased systems
 */
async function createClientsTable() {
  try {
    const connection = await pool.getConnection();
    
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS clients (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        company_name VARCHAR(255) NOT NULL,
        contact_email VARCHAR(255) NOT NULL,
        contact_phone VARCHAR(20),
        address TEXT,
        tax_id VARCHAR(100),
        status ENUM('active', 'suspended', 'cancelled') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_status (status)
      )
    `;
    
    await connection.execute(createTableQuery);
    console.log('✅ Clients table created/verified successfully!');
    connection.release();
    
  } catch (error) {
    console.error('❌ Error creating clients table:', error.message);
    throw error;
  }
}

/**
 * Create client_subscriptions table - Tracks which systems clients have purchased
 */
async function createClientSubscriptionsTable() {
  try {
    const connection = await pool.getConnection();
    
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS client_subscriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        client_id INT NOT NULL,
        system_id INT NOT NULL,
        plan_id INT NOT NULL,
        database_name VARCHAR(100) UNIQUE NOT NULL,
        subdomain VARCHAR(100) UNIQUE,
        api_key VARCHAR(255) UNIQUE NOT NULL,
        status ENUM('active', 'trial', 'expired', 'cancelled') DEFAULT 'trial',
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        auto_renew BOOLEAN DEFAULT true,
        last_payment_date TIMESTAMP NULL,
        next_billing_date DATE NULL,
        total_amount DECIMAL(10, 2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
        FOREIGN KEY (system_id) REFERENCES systems(id) ON DELETE CASCADE,
        FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE,
        INDEX idx_client_id (client_id),
        INDEX idx_system_id (system_id),
        INDEX idx_status (status),
        INDEX idx_api_key (api_key)
      )
    `;
    
    await connection.execute(createTableQuery);
    console.log('✅ Client subscriptions table created/verified successfully!');
    connection.release();
    
  } catch (error) {
    console.error('❌ Error creating client_subscriptions table:', error.message);
    throw error;
  }
}

/**
 * Create api_usage_logs table - Track API usage to prevent sharing
 */
async function createApiUsageLogsTable() {
  try {
    const connection = await pool.getConnection();
    
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS api_usage_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        subscription_id INT NOT NULL,
        api_key VARCHAR(255) NOT NULL,
        endpoint VARCHAR(255),
        method VARCHAR(10),
        ip_address VARCHAR(45),
        user_agent TEXT,
        request_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        response_status INT,
        device_fingerprint VARCHAR(255),
        location VARCHAR(100),
        FOREIGN KEY (subscription_id) REFERENCES client_subscriptions(id) ON DELETE CASCADE,
        INDEX idx_subscription_id (subscription_id),
        INDEX idx_api_key (api_key),
        INDEX idx_request_timestamp (request_timestamp)
      )
    `;
    
    await connection.execute(createTableQuery);
    console.log('✅ API usage logs table created/verified successfully!');
    connection.release();
    
  } catch (error) {
    console.error('❌ Error creating api_usage_logs table:', error.message);
    throw error;
  }
}

/**
 * Create payments table - Track payment history
 */
async function createPaymentsTable() {
  try {
    const connection = await pool.getConnection();
    
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        client_id INT NOT NULL,
        subscription_id INT NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'USD',
        payment_method VARCHAR(50),
        transaction_id VARCHAR(255) UNIQUE,
        status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
        payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
        FOREIGN KEY (subscription_id) REFERENCES client_subscriptions(id) ON DELETE CASCADE,
        INDEX idx_client_id (client_id),
        INDEX idx_subscription_id (subscription_id),
        INDEX idx_status (status),
        INDEX idx_payment_date (payment_date)
      )
    `;
    
    await connection.execute(createTableQuery);
    console.log('✅ Payments table created/verified successfully!');
    connection.release();
    
  } catch (error) {
    console.error('❌ Error creating payments table:', error.message);
    throw error;
  }
}

/**
 * Create system_notifications table - For client alerts
 */
async function createSystemNotificationsTable() {
  try {
    const connection = await pool.getConnection();
    
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS system_notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        client_id INT NOT NULL,
        subscription_id INT,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type ENUM('info', 'warning', 'error', 'success') DEFAULT 'info',
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
        FOREIGN KEY (subscription_id) REFERENCES client_subscriptions(id) ON DELETE CASCADE,
        INDEX idx_client_id (client_id),
        INDEX idx_is_read (is_read)
      )
    `;
    
    await connection.execute(createTableQuery);
    console.log('✅ System notifications table created/verified successfully!');
    connection.release();
    
  } catch (error) {
    console.error('❌ Error creating system_notifications table:', error.message);
    throw error;
  }
}

/**
 * Initialize all SaaS tables
 */
async function initializeSaaSTables() {
  try {
    await createSystemsTable();
    await createSubscriptionPlansTable();
    await createClientsTable();
    await createClientSubscriptionsTable();
    await createApiUsageLogsTable();
    await createPaymentsTable();
    await createSystemNotificationsTable();
    
    console.log('\n🎉 All SaaS tables initialized successfully!\n');
  } catch (error) {
    console.error('❌ Error initializing SaaS tables:', error.message);
    throw error;
  }
}

/**
 * Seed initial systems data
 */
async function seedInitialSystems() {
  try {
    const connection = await pool.getConnection();
    
    // Check if systems already exist
    const [existing] = await connection.execute('SELECT COUNT(*) as count FROM systems');
    
    if (existing[0].count === 0) {
      const systems = [
        {
          name: 'Gym Management System',
          description: 'Complete gym management solution with member tracking, payment processing, workout plans, and attendance monitoring.',
          category: 'Fitness',
          python_file_path: 'systems/gym_management.py',
          icon_url: '/images/systems/gym-icon.png',
          features: JSON.stringify([
            'Member Management',
            'Payment & Billing',
            'Attendance Tracking',
            'Workout Plans',
            'Staff Management',
            'Equipment Tracking',
            'Reports & Analytics'
          ])
        },
        {
          name: 'Restaurant Management System',
          description: 'Full-featured restaurant management with POS, inventory, table management, and kitchen display system.',
          category: 'Food & Beverage',
          python_file_path: 'systems/restaurant_management.py',
          icon_url: '/images/systems/restaurant-icon.png',
          features: JSON.stringify([
            'POS System',
            'Table Management',
            'Inventory Control',
            'Kitchen Display',
            'Staff Scheduling',
            'Menu Management',
            'Sales Reports'
          ])
        }
      ];
      
      for (const system of systems) {
        await connection.execute(
          'INSERT INTO systems (name, description, category, python_file_path, icon_url, features) VALUES (?, ?, ?, ?, ?, ?)',
          [system.name, system.description, system.category, system.python_file_path, system.icon_url, system.features]
        );
      }
      
      console.log('✅ Initial systems seeded successfully!');
    }
    
    connection.release();
  } catch (error) {
    console.error('❌ Error seeding systems:', error.message);
    throw error;
  }
}

/**
 * Seed initial subscription plans
 */
async function seedInitialPlans() {
  try {
    const connection = await pool.getConnection();
    
    // Check if plans already exist
    const [existing] = await connection.execute('SELECT COUNT(*) as count FROM subscription_plans');
    
    if (existing[0].count === 0) {
      // Get system IDs
      const [systems] = await connection.execute('SELECT id, name FROM systems');
      
      for (const system of systems) {
        const plans = [
          {
            name: 'Starter Plan',
            description: 'Perfect for small businesses getting started',
            price: 29.99,
            billing_cycle: 'monthly',
            max_users: 5,
            max_storage_gb: 5,
            support_level: 'basic',
            features: JSON.stringify(['Basic Features', 'Email Support', '5 Users', '5GB Storage'])
          },
          {
            name: 'Professional Plan',
            description: 'Ideal for growing businesses',
            price: 79.99,
            billing_cycle: 'monthly',
            max_users: 20,
            max_storage_gb: 20,
            support_level: 'standard',
            features: JSON.stringify(['All Features', 'Priority Support', '20 Users', '20GB Storage', 'Advanced Analytics'])
          },
          {
            name: 'Enterprise Plan',
            description: 'For large-scale operations',
            price: 199.99,
            billing_cycle: 'monthly',
            max_users: 100,
            max_storage_gb: 100,
            support_level: 'premium',
            features: JSON.stringify(['Unlimited Features', '24/7 Support', '100 Users', '100GB Storage', 'Custom Integrations', 'Dedicated Account Manager'])
          }
        ];
        
        for (const plan of plans) {
          await connection.execute(
            'INSERT INTO subscription_plans (system_id, name, description, price, billing_cycle, max_users, max_storage_gb, support_level, features) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [system.id, plan.name, plan.description, plan.price, plan.billing_cycle, plan.max_users, plan.max_storage_gb, plan.support_level, plan.features]
          );
        }
      }
      
      console.log('✅ Initial subscription plans seeded successfully!');
    }
    
    connection.release();
  } catch (error) {
    console.error('❌ Error seeding plans:', error.message);
    throw error;
  }
}

module.exports = {
  initializeSaaSTables,
  seedInitialSystems,
  seedInitialPlans,
  createSystemsTable,
  createSubscriptionPlansTable,
  createClientsTable,
  createClientSubscriptionsTable,
  createApiUsageLogsTable,
  createPaymentsTable,
  createSystemNotificationsTable
};
