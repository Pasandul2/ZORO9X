/**
 * Migration: Add user_id to clients table
 * Adds user_id column to support SaaS subscriptions while keeping existing admin client management
 */

const { pool } = require('../config/database');

async function migrate() {
  try {
    console.log('🔄 Starting migration: add_user_id_to_clients...');

    const connection = await pool.getConnection();

    // Check if user_id column already exists
    const [columns] = await connection.execute(
      `SHOW COLUMNS FROM clients LIKE 'user_id'`
    );

    if (columns.length > 0) {
      console.log('✅ user_id column already exists');
      connection.release();
      return;
    }

    // Add user_id column (nullable to support existing records)
    await connection.execute(`
      ALTER TABLE clients
      ADD COLUMN user_id INT NULL AFTER id,
      ADD INDEX idx_user_id (user_id),
      ADD CONSTRAINT fk_clients_user_id 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    `);

    console.log('✅ user_id column added to clients table');
    
    // Update email column to handle both contact_email and email
    const [emailColumn] = await connection.execute(
      `SHOW COLUMNS FROM clients LIKE 'contact_email'`
    );

    if (emailColumn.length === 0) {
      // Add contact_email as an alias for email
      await connection.execute(`
        ALTER TABLE clients
        ADD COLUMN contact_email VARCHAR(255) NULL AFTER email
      `);
      
      // Copy email values to contact_email
      await connection.execute(`
        UPDATE clients SET contact_email = email WHERE contact_email IS NULL
      `);
      
      console.log('✅ contact_email column added to clients table');
    }

    connection.release();
    console.log('✅ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration error:', error.message);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  migrate()
    .then(() => {
      console.log('✅ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrate };
