/**
 * Database Synchronization Utility
 * 
 * Creates and manages remote backup databases for client systems
 * Naming: {client_email}_{system_name}_{database_name}
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

/**
 * Create a connection to MySQL server (without specific database)
 */
async function createConnection() {
  return await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || ''
  });
}

/**
 * Sanitize database name - remove special characters, spaces, etc.
 */
function sanitizeDatabaseName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 64); // MySQL database name limit
}

/**
 * Generate remote database name from client info
 * Format: client_email_system_name_db_name
 */
function generateRemoteDatabaseName(clientEmail, systemName, databaseName) {
  const emailPart = clientEmail.split('@')[0]; // Take username part only
  const sanitizedEmail = sanitizeDatabaseName(emailPart);
  const sanitizedSystem = sanitizeDatabaseName(systemName);
  const sanitizedDb = sanitizeDatabaseName(databaseName);
  
  return `${sanitizedEmail}_${sanitizedSystem}_${sanitizedDb}`;
}

/**
 * Create remote database for client system
 */
async function createRemoteDatabase(clientEmail, systemName, databaseName, tables = []) {
  const connection = await createConnection();
  
  try {
    const remoteDatabaseName = generateRemoteDatabaseName(clientEmail, systemName, databaseName);
    
    // Check if database already exists
    const [databases] = await connection.query(
      'SHOW DATABASES LIKE ?',
      [remoteDatabaseName]
    );
    
    if (databases.length > 0) {
      console.log(`Database ${remoteDatabaseName} already exists`);
      return {
        success: true,
        database_name: remoteDatabaseName,
        exists: true
      };
    }
    
    // Create database
    await connection.query(`CREATE DATABASE \`${remoteDatabaseName}\``);
    console.log(`Created database: ${remoteDatabaseName}`);
    
    // Use the new database
    await connection.query(`USE \`${remoteDatabaseName}\``);
    
    // Create tables if provided
    for (const table of tables) {
      await connection.query(table.createStatement);
      console.log(`Created table: ${table.name}`);
    }
    
    return {
      success: true,
      database_name: remoteDatabaseName,
      exists: false,
      tables_created: tables.length
    };
    
  } catch (error) {
    console.error('Error creating remote database:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

/**
 * Get connection to specific remote database
 */
async function getRemoteDatabaseConnection(remoteDatabaseName) {
  return await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: remoteDatabaseName
  });
}

/**
 * Sync data from local to remote database
 */
async function syncToRemote(remoteDatabaseName, tableName, data) {
  const connection = await getRemoteDatabaseConnection(remoteDatabaseName);
  
  try {
    // Convert data to SQL insert or update
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');
    const columns = keys.join(', ');
    const updates = keys.map(key => `${key} = VALUES(${key})`).join(', ');
    
    const sql = `
      INSERT INTO ${tableName} (${columns})
      VALUES (${placeholders})
      ON DUPLICATE KEY UPDATE ${updates}
    `;
    
    await connection.query(sql, values);
    
    return { success: true };
  } catch (error) {
    console.error('Error syncing to remote:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

/**
 * Sync data from remote to local
 */
async function syncFromRemote(remoteDatabaseName, tableName, whereClause = {}) {
  const connection = await getRemoteDatabaseConnection(remoteDatabaseName);
  
  try {
    let sql = `SELECT * FROM ${tableName}`;
    const values = [];
    
    if (Object.keys(whereClause).length > 0) {
      const conditions = Object.keys(whereClause).map(key => `${key} = ?`).join(' AND ');
      sql += ` WHERE ${conditions}`;
      values.push(...Object.values(whereClause));
    }
    
    const [rows] = await connection.query(sql, values);
    
    return {
      success: true,
      data: rows
    };
  } catch (error) {
    console.error('Error syncing from remote:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

/**
 * Get all tables from remote database
 */
async function getRemoteTables(remoteDatabaseName) {
  const connection = await getRemoteDatabaseConnection(remoteDatabaseName);
  
  try {
    const [tables] = await connection.query('SHOW TABLES');
    return {
      success: true,
      tables: tables.map(t => Object.values(t)[0])
    };
  } catch (error) {
    console.error('Error getting remote tables:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

/**
 * Delete remote database
 */
async function deleteRemoteDatabase(remoteDatabaseName) {
  const connection = await createConnection();
  
  try {
    await connection.query(`DROP DATABASE IF EXISTS \`${remoteDatabaseName}\``);
    return { success: true };
  } catch (error) {
    console.error('Error deleting remote database:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

module.exports = {
  createRemoteDatabase,
  getRemoteDatabaseConnection,
  generateRemoteDatabaseName,
  syncToRemote,
  syncFromRemote,
  getRemoteTables,
  deleteRemoteDatabase,
  sanitizeDatabaseName
};
