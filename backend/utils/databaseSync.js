/**
 * Database Synchronization Utility
 * 
 * Creates and manages remote backup databases for client systems
 * Naming: {client_email}_{system_name}_{database_name}
 */

const mysql = require('mysql2/promise');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
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

async function ensureGoldLoanReportSchema(remoteDatabaseName) {
  const connection = await getRemoteDatabaseConnection(remoteDatabaseName);
  const tableDefinitions = {
    customers: `
      CREATE TABLE IF NOT EXISTS customers (
        id BIGINT PRIMARY KEY,
        nic VARCHAR(100), name VARCHAR(255), phone VARCHAR(50), address TEXT,
        birthday VARCHAR(50), job VARCHAR(255), marital_status VARCHAR(50), language VARCHAR(50),
        created_at DATETIME NULL, updated_at DATETIME NULL
      )`,
    loans: `
      CREATE TABLE IF NOT EXISTS loans (
        id BIGINT PRIMARY KEY,
        ticket_no VARCHAR(100), customer_id BIGINT, purpose TEXT, advance_amount DECIMAL(18,2),
        loan_amount DECIMAL(18,2), assessed_value DECIMAL(18,2), market_value DECIMAL(18,2),
        interest_rate DECIMAL(10,4), overdue_interest_rate DECIMAL(10,4), duration_months INT,
        issue_date DATETIME NULL, renew_date DATETIME NULL, expire_date DATETIME NULL,
        status VARCHAR(50), total_gold_weight DECIMAL(18,4), total_item_weight DECIMAL(18,4),
        created_at DATETIME NULL, updated_at DATETIME NULL
      )`,
    loan_items: `
      CREATE TABLE IF NOT EXISTS loan_items (
        id BIGINT PRIMARY KEY, loan_id BIGINT, article_type VARCHAR(255), description TEXT,
        quantity DECIMAL(18,4), total_weight DECIMAL(18,4), gold_weight DECIMAL(18,4),
        carat DECIMAL(10,2), estimated_value DECIMAL(18,2)
      )`,
    loan_renewals: `
      CREATE TABLE IF NOT EXISTS loan_renewals (
        id BIGINT PRIMARY KEY, loan_id BIGINT, old_expire_date DATETIME NULL, new_expire_date DATETIME NULL,
        new_duration_months INT, interest_paid DECIMAL(18,2), payment_amount DECIMAL(18,2),
        normal_interest_due DECIMAL(18,2), overdue_interest_due DECIMAL(18,2), principal_reduction DECIMAL(18,2),
        renewed_at DATETIME NULL, remarks TEXT
      )`,
    loan_payments: `
      CREATE TABLE IF NOT EXISTS loan_payments (
        id BIGINT PRIMARY KEY, loan_id BIGINT, payment_type VARCHAR(50), amount DECIMAL(18,2),
        principal_amount DECIMAL(18,2), interest_amount DECIMAL(18,2), overdue_interest_amount DECIMAL(18,2),
        other_charges_amount DECIMAL(18,2), payment_date DATETIME NULL, remarks TEXT
      )`,
    audit_log: `
      CREATE TABLE IF NOT EXISTS audit_log (
        id BIGINT PRIMARY KEY, action VARCHAR(255), entity_type VARCHAR(100), entity_id BIGINT,
        details TEXT, created_at DATETIME NULL
      )`,
    cash_register: `
      CREATE TABLE IF NOT EXISTS cash_register (
        id BIGINT PRIMARY KEY, transaction_date DATETIME NULL, transaction_type VARCHAR(100),
        description TEXT, amount DECIMAL(18,2), balance_after DECIMAL(18,2), created_at DATETIME NULL
      )`,
  };

  try {
    for (const statement of Object.values(tableDefinitions)) {
      await connection.query(statement);
    }
  } finally {
    await connection.end();
  }
}

function inferColumnType(value) {
  if (typeof value === 'number') return Number.isInteger(value) ? 'BIGINT' : 'DECIMAL(18,6)';
  if (typeof value === 'boolean') return 'TINYINT(1)';
  if (value instanceof Date || (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value))) return 'DATETIME NULL';
  return 'TEXT';
}

function readSqliteBackup(backupPath, encrypted, apiKey, subscriptionId) {
  let databasePath = backupPath;
  let temporaryPath = null;
  try {
    if (encrypted) {
      const encryptedData = fs.readFileSync(backupPath);
      const salt = encryptedData.subarray(0, 32);
      const iv = encryptedData.subarray(32, 48);
      const decipher = crypto.createDecipheriv(
        'aes-256-cbc',
        crypto.pbkdf2Sync(`${apiKey}:${subscriptionId}`, salt, 100000, 32, 'sha256'),
        iv
      );
      const decrypted = Buffer.concat([decipher.update(encryptedData.subarray(48)), decipher.final()]);
      temporaryPath = path.join(os.tmpdir(), `zoro9x-report-${subscriptionId}-${Date.now()}.db`);
      fs.writeFileSync(temporaryPath, decrypted);
      databasePath = temporaryPath;
    }

    const script = `
import json, sqlite3, sys
db = sqlite3.connect(sys.argv[1])
db.row_factory = sqlite3.Row
tables = db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").fetchall()
result = {}
for table in tables:
    name = table[0]
    rows = db.execute('SELECT * FROM "' + name.replace('"', '""') + '"').fetchall()
    result[name] = [dict(row) for row in rows]
print(json.dumps(result, default=str))
`;
    const result = spawnSync(process.env.PYTHON || 'python', ['-c', script, databasePath], {
      encoding: 'utf8',
      maxBuffer: 50 * 1024 * 1024,
    });
    if (result.status !== 0) throw new Error(result.stderr || 'Unable to read SQLite backup');
    return JSON.parse(result.stdout || '{}');
  } finally {
    if (temporaryPath) fs.rmSync(temporaryPath, { force: true });
  }
}

async function restoreSqliteBackupToRemote(remoteDatabaseName, backup, apiKey, subscriptionId) {
  if (!backup?.file_path || !fs.existsSync(backup.file_path)) return 0;
  const tables = readSqliteBackup(backup.file_path, Boolean(backup.is_encrypted), apiKey, subscriptionId);
  const connection = await getRemoteDatabaseConnection(remoteDatabaseName);
  let imported = 0;
  try {
    for (const [tableName, rows] of Object.entries(tables)) {
      if (!/^[a-zA-Z0-9_]+$/.test(tableName)) continue;
      for (const data of rows) {
        if (!data || data.id === undefined || data.id === null) continue;
        await connection.query(`CREATE TABLE IF NOT EXISTS \`${tableName}\` (id BIGINT PRIMARY KEY)`);
        const [existingColumns] = await connection.query(`SHOW COLUMNS FROM \`${tableName}\``);
        const existingColumnNames = new Set(existingColumns.map(column => column.Field));
        for (const [key, value] of Object.entries(data)) {
          if (!/^[a-zA-Z0-9_]+$/.test(key) || existingColumnNames.has(key) || key === 'id') continue;
          await connection.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${key}\` ${inferColumnType(value)}`);
        }
        const keys = Object.keys(data);
        const escapedKeys = keys.map(key => `\`${key}\``).join(', ');
        const placeholders = keys.map(() => '?').join(', ');
        const updates = keys.filter(key => key !== 'id').map(key => `\`${key}\` = VALUES(\`${key}\`)`).join(', ');
        await connection.query(
          `INSERT INTO \`${tableName}\` (${escapedKeys}) VALUES (${placeholders})${updates ? ` ON DUPLICATE KEY UPDATE ${updates}` : ''}`,
          Object.values(data)
        );
        imported += 1;
      }
    }
    return imported;
  } finally {
    await connection.end();
  }
}

/**
 * Sync data from local to remote database
 */
async function syncToRemote(remoteDatabaseName, tableName, data) {
  const connection = await getRemoteDatabaseConnection(remoteDatabaseName);
  
  try {
    if (!/^[a-zA-Z0-9_]+$/.test(tableName) || !data || typeof data !== 'object') {
      throw new Error('Invalid table name or row data');
    }

    await connection.query(`CREATE TABLE IF NOT EXISTS \`${tableName}\` (id BIGINT PRIMARY KEY)`);
    const [existingColumns] = await connection.query(`SHOW COLUMNS FROM \`${tableName}\``);
    const existingColumnNames = new Set(existingColumns.map(column => column.Field));
    for (const [key, value] of Object.entries(data)) {
      if (!/^[a-zA-Z0-9_]+$/.test(key) || existingColumnNames.has(key) || key === 'id') continue;
      await connection.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${key}\` ${inferColumnType(value)}`);
    }

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
  ensureGoldLoanReportSchema,
  readSqliteBackup,
  restoreSqliteBackupToRemote,
  generateRemoteDatabaseName,
  syncToRemote,
  syncFromRemote,
  getRemoteTables,
  deleteRemoteDatabase,
  sanitizeDatabaseName
};
