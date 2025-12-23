/**
 * Database Configuration
 * 
 * Manages MySQL connection pool using mysql2/promise
 * Uses XAMPP MySQL for development
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

// ============================================
// CREATE CONNECTION POOL
// ============================================
/**
 * Create a pool of connections to MySQL database
 * - Reuses connections for better performance
 * - Handles multiple concurrent requests
 * - Connection limit: 10 (adjustable)
 */
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'zoro9x',
  waitForConnections: true,      // Wait for connection if pool full
  connectionLimit: 10,             // Max 10 connections
  queueLimit: 0,                   // Unlimited queue
});

// ============================================
// DATABASE INITIALIZATION
// ============================================
/**
 * Test database connection
 * Called during server startup
 * 
 * @returns {Promise<boolean>} - true if connected, false if failed
 */
async function initializeDatabase() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully!');
    console.log(`   Host: ${process.env.DB_HOST}`);
    console.log(`   Database: ${process.env.DB_NAME}`);
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    return false;
  }
}

module.exports = { pool, initializeDatabase };
