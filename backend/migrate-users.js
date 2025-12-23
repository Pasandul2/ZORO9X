/**
 * Migration Script - Add missing columns to users table
 * 
 * Run this once to fix the users table
 */

const { pool } = require('./config/database');

async function migrateUsersTable() {
  try {
    console.log('🔄 Starting users table migration...');
    const connection = await pool.getConnection();
    
    // Get current columns
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'users'
    `);
    
    const existingColumns = columns.map(col => col.COLUMN_NAME);
    console.log('📋 Existing columns:', existingColumns.join(', '));
    
    // Add is_verified
    if (!existingColumns.includes('is_verified')) {
      console.log('➕ Adding is_verified column...');
      await connection.execute(`
        ALTER TABLE users 
        ADD COLUMN is_verified BOOLEAN DEFAULT FALSE AFTER phone
      `);
      console.log('✅ is_verified added');
    } else {
      console.log('✓ is_verified already exists');
    }
    
    // Add verification_code
    if (!existingColumns.includes('verification_code')) {
      console.log('➕ Adding verification_code column...');
      await connection.execute(`
        ALTER TABLE users 
        ADD COLUMN verification_code VARCHAR(6) AFTER is_verified
      `);
      console.log('✅ verification_code added');
    } else {
      console.log('✓ verification_code already exists');
    }
    
    // Add verification_code_expires
    if (!existingColumns.includes('verification_code_expires')) {
      console.log('➕ Adding verification_code_expires column...');
      await connection.execute(`
        ALTER TABLE users 
        ADD COLUMN verification_code_expires TIMESTAMP NULL AFTER verification_code
      `);
      console.log('✅ verification_code_expires added');
    } else {
      console.log('✓ verification_code_expires already exists');
    }
    
    // Add reset_password_code
    if (!existingColumns.includes('reset_password_code')) {
      console.log('➕ Adding reset_password_code column...');
      await connection.execute(`
        ALTER TABLE users 
        ADD COLUMN reset_password_code VARCHAR(6) AFTER verification_code_expires
      `);
      console.log('✅ reset_password_code added');
    } else {
      console.log('✓ reset_password_code already exists');
    }
    
    // Add reset_password_expires
    if (!existingColumns.includes('reset_password_expires')) {
      console.log('➕ Adding reset_password_expires column...');
      await connection.execute(`
        ALTER TABLE users 
        ADD COLUMN reset_password_expires TIMESTAMP NULL AFTER reset_password_code
      `);
      console.log('✅ reset_password_expires added');
    } else {
      console.log('✓ reset_password_expires already exists');
    }
    
    // Verify final columns
    const [finalColumns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'users'
    `);
    
    console.log('\n📋 Final columns:', finalColumns.map(col => col.COLUMN_NAME).join(', '));
    
    connection.release();
    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    process.exit(1);
  }
}

// Run migration
migrateUsersTable();
