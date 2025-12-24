/**
 * Admin Schema Configuration
 * Creates and manages the admin table structure
 * Separate from regular users table for enhanced security
 */

const bcrypt = require('bcryptjs');
const { pool } = require('./database');

/**
 * Creates the admin table if it doesn't exist
 * Includes a default admin user with secure credentials
 * 
 * @returns {Promise<void>}
 */
const createAdminTable = async () => {
  try {
    // Create admin table with secure structure
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS admins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        fullName VARCHAR(255) NOT NULL,
        role ENUM('super_admin', 'admin') DEFAULT 'admin',
        permissions JSON DEFAULT NULL,
        status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;

    await pool.query(createTableQuery);
    console.log('✅ Admins table created/verified successfully!');

    // Check if default admin exists
    const [existingAdmin] = await pool.query(
      'SELECT * FROM admins WHERE email = ?',
      ['zoro9x.tm@gmail.com']
    );

    // Create default admin if doesn't exist
    if (existingAdmin.length === 0) {
      const hashedPassword = await bcrypt.hash('2025@Zoro9x', 10);
      
      await pool.query(
        'INSERT INTO admins (email, password, fullName, role) VALUES (?, ?, ?, ?)',
        ['zoro9x.tm@gmail.com', hashedPassword, 'ZORO9X Admin', 'super_admin']
      );
      
      console.log('✅ Default admin account created successfully!');
      console.log('   Email: zoro9x.tm@gmail.com');
      console.log('   Password: 2025@Zoro9x');
    }

  } catch (error) {
    console.error('❌ Error creating admin table:', error);
    throw error;
  }
};

module.exports = { createAdminTable };
