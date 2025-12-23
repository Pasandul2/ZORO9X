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

// ============================================
// CREATE PORTFOLIO TABLE
// ============================================
/**
 * Create portfolio table for managing portfolio items
 * 
 * Columns:
 * - id: Auto-incrementing primary key
 * - title: Project title
 * - description: Project description
 * - image: Image URL/path
 * - link: Live project link
 * - github: GitHub repository link (optional)
 * - technologies: JSON array of technologies used
 * - created_at: Creation timestamp
 * - updated_at: Last update timestamp
 */
async function createPortfolioTable() {
  try {
    const connection = await pool.getConnection();
    
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS portfolio (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        image VARCHAR(500) NOT NULL,
        link VARCHAR(500),
        github VARCHAR(500),
        technologies JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;
    
    await connection.execute(createTableQuery);
    console.log('✅ Portfolio table created/verified successfully!');
    connection.release();
    
  } catch (error) {
    console.error('❌ Error creating portfolio table:', error.message);
    throw error;
  }
}

module.exports = { createUserTable, createPortfolioTable };
