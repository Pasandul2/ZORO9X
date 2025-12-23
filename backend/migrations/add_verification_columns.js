/**
 * Database Migration: Add Email Verification & Password Reset Columns
 * 
 * Run this once to add new columns to existing users table
 */

const { pool } = require('../config/database');

async function migrateDatabase() {
  let connection;
  
  try {
    console.log('🔄 Starting database migration...');
    connection = await pool.getConnection();

    // Add is_verified column
    try {
      await connection.execute(`
        ALTER TABLE users 
        ADD COLUMN is_verified BOOLEAN DEFAULT FALSE
      `);
      console.log('✅ Added is_verified column');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('⏭️  is_verified column already exists');
      } else {
        throw error;
      }
    }

    // Add verification_code column
    try {
      await connection.execute(`
        ALTER TABLE users 
        ADD COLUMN verification_code VARCHAR(6)
      `);
      console.log('✅ Added verification_code column');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('⏭️  verification_code column already exists');
      } else {
        throw error;
      }
    }

    // Add verification_code_expires column
    try {
      await connection.execute(`
        ALTER TABLE users 
        ADD COLUMN verification_code_expires TIMESTAMP NULL
      `);
      console.log('✅ Added verification_code_expires column');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('⏭️  verification_code_expires column already exists');
      } else {
        throw error;
      }
    }

    // Add reset_password_code column
    try {
      await connection.execute(`
        ALTER TABLE users 
        ADD COLUMN reset_password_code VARCHAR(6)
      `);
      console.log('✅ Added reset_password_code column');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('⏭️  reset_password_code column already exists');
      } else {
        throw error;
      }
    }

    // Add reset_password_expires column
    try {
      await connection.execute(`
        ALTER TABLE users 
        ADD COLUMN reset_password_expires TIMESTAMP NULL
      `);
      console.log('✅ Added reset_password_expires column');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('⏭️  reset_password_expires column already exists');
      } else {
        throw error;
      }
    }

    // Set existing users as verified (optional - you can skip this)
    await connection.execute(`
      UPDATE users SET is_verified = TRUE WHERE is_verified IS NULL OR is_verified = FALSE
    `);
    console.log('✅ Marked existing users as verified');

    console.log('✅ Database migration completed successfully!');
    connection.release();
    process.exit(0);

  } catch (error) {
    console.error('❌ Migration error:', error.message);
    if (connection) connection.release();
    process.exit(1);
  }
}

// Run migration
migrateDatabase();
