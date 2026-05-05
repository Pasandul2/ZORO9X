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

// ============================================
// CREATE LEADS TABLE
// ============================================
/**
 * Create leads table for storing sales lead information
 *
 * Columns:
 * - id: Auto-increment primary key
 * - shop_name: Shop / business name
 * - location: Text for locality/address
 * - contact_number: Phone number string
 * - status: ENUM-like VARCHAR to store contact, interested, confirmed, declined
 * - notes: Optional text notes
 * - image: Image path for uploaded photo
 * - created_by: optional user id who added the lead
 * - created_at / updated_at timestamps
 */
async function createLeadsTable() {
  try {
    const connection = await pool.getConnection();

    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS leads (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop_name VARCHAR(255) NOT NULL,
        location VARCHAR(500),
        country_code VARCHAR(10) DEFAULT '+94',
        contact_number VARCHAR(50),
        status VARCHAR(50) DEFAULT 'contact only',
        priority VARCHAR(20) DEFAULT 'medium',
        is_starred BOOLEAN DEFAULT FALSE,
        contact_attempts INT DEFAULT 0,
        next_follow_up_date DATE NULL,
        last_contact_at DATETIME NULL,
        notes TEXT,
        special_note TEXT,
        image VARCHAR(500),
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;

    await connection.execute(createTableQuery);

    // Ensure new columns exist even for older databases.
    const [columns] = await connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'leads'`
    );
    const columnSet = new Set(columns.map((col) => col.COLUMN_NAME));

    if (!columnSet.has('priority')) {
      await connection.execute("ALTER TABLE leads ADD COLUMN priority VARCHAR(20) DEFAULT 'medium'");
    }
    if (!columnSet.has('country_code')) {
      await connection.execute("ALTER TABLE leads ADD COLUMN country_code VARCHAR(10) DEFAULT '+94'");
    }
    if (!columnSet.has('is_starred')) {
      await connection.execute('ALTER TABLE leads ADD COLUMN is_starred BOOLEAN DEFAULT FALSE');
    }
    if (!columnSet.has('contact_attempts')) {
      await connection.execute('ALTER TABLE leads ADD COLUMN contact_attempts INT DEFAULT 0');
    }
    if (!columnSet.has('next_follow_up_date')) {
      await connection.execute('ALTER TABLE leads ADD COLUMN next_follow_up_date DATE NULL');
    }
    if (!columnSet.has('last_contact_at')) {
      await connection.execute('ALTER TABLE leads ADD COLUMN last_contact_at DATETIME NULL');
    }
    if (!columnSet.has('special_note')) {
      await connection.execute('ALTER TABLE leads ADD COLUMN special_note TEXT');
    }

    console.log('✅ Leads table created/verified successfully!');
    connection.release();
  } catch (error) {
    console.error('❌ Error creating leads table:', error.message);
    throw error;
  }
}

module.exports = { createUserTable, createPortfolioTable, createLeadsTable };
