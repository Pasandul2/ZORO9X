/**
 * Migration: Fix Clients Table Schema
 * Drops the old clients table and recreates it with the proper schema
 */

const { pool } = require('../config/database');

async function migrate() {
  try {
    console.log('🔄 Starting clients table migration...');

    // Disable foreign key checks temporarily
    await pool.query('SET FOREIGN_KEY_CHECKS = 0');

    // Drop all related tables in order
    await pool.query('DROP TABLE IF EXISTS quotations');
    await pool.query('DROP TABLE IF EXISTS invoices');
    await pool.query('DROP TABLE IF EXISTS system_notifications');
    await pool.query('DROP TABLE IF EXISTS security_alerts');
    await pool.query('DROP TABLE IF EXISTS device_activations');
    await pool.query('DROP TABLE IF EXISTS license_tokens');
    await pool.query('DROP TABLE IF EXISTS payments');
    await pool.query('DROP TABLE IF EXISTS api_usage_logs');
    await pool.query('DROP TABLE IF EXISTS client_subscriptions');
    await pool.query('DROP TABLE IF EXISTS clients');
    console.log('✅ Old clients table and related tables dropped');

    // Re-enable foreign key checks
    await pool.query('SET FOREIGN_KEY_CHECKS = 1');

    // Recreate the clients table with proper schema
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS clients (
        id INT AUTO_INCREMENT PRIMARY KEY,
        client_name VARCHAR(255) NOT NULL,
        company_name VARCHAR(255),
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        address TEXT,
        country VARCHAR(100),
        tax_id VARCHAR(100),
        website VARCHAR(255),
        contact_person VARCHAR(255),
        payment_terms VARCHAR(50) DEFAULT 'Net 30',
        notes TEXT,
        status ENUM('active', 'inactive', 'archived') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_by INT,
        FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL
      )
    `;

    await pool.query(createTableQuery);
    console.log('✅ Clients table recreated with proper schema');

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  migrate()
    .then(() => {
      console.log('Migration finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration error:', error);
      process.exit(1);
    });
}

module.exports = { migrate };
