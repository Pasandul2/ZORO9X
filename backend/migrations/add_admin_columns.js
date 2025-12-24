/**
 * Migration: Add permissions and status columns to admins table
 * Adds support for granular permission management and admin status tracking
 */

const { pool } = require('../config/database');

const migrate = async () => {
  try {
    console.log('Running migration: add_admin_columns.js');

    // Check if columns already exist
    const [columns] = await pool.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'admins' 
      AND COLUMN_NAME IN ('permissions', 'status')
    `);

    if (columns.length < 2) {
      // Add permissions column if it doesn't exist
      const [permissionsColumn] = await pool.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'admins' 
        AND COLUMN_NAME = 'permissions'
      `);

      if (permissionsColumn.length === 0) {
        await pool.query(`
          ALTER TABLE admins 
          ADD COLUMN permissions JSON DEFAULT NULL
        `);
        console.log('✅ Added permissions column');
      }

      // Add status column if it doesn't exist
      const [statusColumn] = await pool.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'admins' 
        AND COLUMN_NAME = 'status'
      `);

      if (statusColumn.length === 0) {
        await pool.query(`
          ALTER TABLE admins 
          ADD COLUMN status ENUM('active', 'inactive', 'suspended') DEFAULT 'active'
        `);
        console.log('✅ Added status column');
      }
    } else {
      console.log('✅ Columns already exist');
    }

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  }
};

module.exports = { migrate };
