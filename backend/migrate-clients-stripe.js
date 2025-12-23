/**
 * Migration Script - Add stripe_customer_id to clients table
 * Run: node migrate-clients-stripe.js
 */

const { pool } = require('./config/database');

async function migrateClientsTable() {
  try {
    console.log('🔄 Starting clients table migration...');
    const connection = await pool.getConnection();

    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'clients'
    `);

    const existingColumns = columns.map(c => c.COLUMN_NAME);
    console.log('📋 Existing columns:', existingColumns.join(', '));

    if (!existingColumns.includes('stripe_customer_id')) {
      console.log('➕ Adding stripe_customer_id column...');
      await connection.execute(`
        ALTER TABLE clients
        ADD COLUMN stripe_customer_id VARCHAR(255) DEFAULT NULL AFTER company_email
      `);
      console.log('✅ stripe_customer_id added');
    } else {
      console.log('✓ stripe_customer_id already exists');
    }

    // Optionally add stripe fields for payments table if missing
    const [payCols] = await connection.execute(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'payments'
    `);
    const payExisting = payCols.map(c => c.COLUMN_NAME);
    if (!payExisting.includes('stripe_payment_intent_id')) {
      console.log('➕ Adding stripe_payment_intent_id to payments...');
      await connection.execute(`
        ALTER TABLE payments
        ADD COLUMN stripe_payment_intent_id VARCHAR(255) DEFAULT NULL AFTER transaction_id
      `);
      console.log('✅ stripe_payment_intent_id added');
    } else {
      console.log('✓ stripe_payment_intent_id already exists');
    }

    const [finalCols] = await connection.execute(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'clients'
    `);
    console.log('\n📋 Final clients columns:', finalCols.map(c => c.COLUMN_NAME).join(', '));

    connection.release();
    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    process.exit(1);
  }
}

migrateClientsTable();
