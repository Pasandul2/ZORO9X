/**
 * Database Schema Configuration
 * 
 * Defines and creates database tables
 */

const { pool } = require('./database');

// ============================================
// CREATE USERS TABLE
// ============================================
/**
 * Create users table with all necessary columns
 * 
 * Columns:
 * - id: Auto-incrementing primary key
 * - email: Unique user email (for login)
 * - password: Hashed password (using bcryptjs)
 * - fullName: User's full name
 * - phone: Optional phone number
 * - created_at: Account creation timestamp
 * - updated_at: Last update timestamp
 */
async function createUserTable() {
  try {
    const connection = await pool.getConnection();
    
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        fullName VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        is_verified BOOLEAN DEFAULT FALSE,
        verification_code VARCHAR(6),
        verification_code_expires TIMESTAMP NULL,
        reset_password_code VARCHAR(6),
        reset_password_expires TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;
    
    await connection.execute(createTableQuery);
    
    // Check and add missing columns for existing tables
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'users'
    `);
    
    const existingColumns = columns.map(col => col.COLUMN_NAME);
    
    // Add is_verified if missing
    if (!existingColumns.includes('is_verified')) {
      await connection.execute(`
        ALTER TABLE users 
        ADD COLUMN is_verified BOOLEAN DEFAULT FALSE
      `);
    }
    
    // Add verification_code if missing
    if (!existingColumns.includes('verification_code')) {
      await connection.execute(`
        ALTER TABLE users 
        ADD COLUMN verification_code VARCHAR(6)
      `);
    }
    
    // Add verification_code_expires if missing
    if (!existingColumns.includes('verification_code_expires')) {
      await connection.execute(`
        ALTER TABLE users 
        ADD COLUMN verification_code_expires TIMESTAMP NULL
      `);
    }
    
    // Add reset_password_code if missing
    if (!existingColumns.includes('reset_password_code')) {
      await connection.execute(`
        ALTER TABLE users 
        ADD COLUMN reset_password_code VARCHAR(6)
      `);
    }
    
    // Add reset_password_expires if missing
    if (!existingColumns.includes('reset_password_expires')) {
      await connection.execute(`
        ALTER TABLE users 
        ADD COLUMN reset_password_expires TIMESTAMP NULL
      `);
    }
    
    console.log('✅ Users table created/verified successfully!');
    connection.release();
    
  } catch (error) {
    console.error('❌ Error creating users table:', error.message);
    throw error;
  }
}

module.exports = { createUserTable };
