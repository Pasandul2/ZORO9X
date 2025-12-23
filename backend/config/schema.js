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
    console.log('✅ Users table created/verified successfully!');
    connection.release();
    
  } catch (error) {
    console.error('❌ Error creating users table:', error.message);
    throw error;
  }
}

module.exports = { createUserTable };
