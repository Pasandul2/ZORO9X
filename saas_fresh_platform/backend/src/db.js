const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const {
  mysqlHost,
  mysqlPort,
  mysqlUser,
  mysqlPassword,
  mysqlDatabase,
  seedAdminEmail,
  seedAdminPassword
} = require('./config');

let pool;

async function ensureColumn(tableName, columnName, columnDefinition) {
  const [columns] = await pool.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [mysqlDatabase, tableName, columnName]
  );

  if (columns.length === 0) {
    await pool.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnDefinition}`);
  }
}

async function initDb() {
  let adminConnection;
  try {
    adminConnection = await mysql.createConnection({
      host: mysqlHost,
      port: mysqlPort,
      user: mysqlUser,
      password: mysqlPassword,
      multipleStatements: true
    });
  } catch (error) {
    const details = [
      `MySQL connection failed (${error.code || 'UNKNOWN'})`,
      `host=${mysqlHost}`,
      `port=${mysqlPort}`,
      `user=${mysqlUser}`
    ].join(', ');
    throw new Error(details);
  }

  await adminConnection.query(`CREATE DATABASE IF NOT EXISTS \`${mysqlDatabase}\``);
  await adminConnection.end();

  pool = mysql.createPool({
    host: mysqlHost,
    port: mysqlPort,
    user: mysqlUser,
    password: mysqlPassword,
    database: mysqlDatabase,
    multipleStatements: true,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(64) PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      created_at DATETIME NOT NULL
    ) ENGINE=InnoDB;

    CREATE TABLE IF NOT EXISTS products (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) UNIQUE NOT NULL,
      price_usd INT NOT NULL,
      created_at DATETIME NOT NULL
    ) ENGINE=InnoDB;

    CREATE TABLE IF NOT EXISTS licenses (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      product_id VARCHAR(64) NOT NULL,
      activation_key VARCHAR(64) UNIQUE NOT NULL,
      device_id VARCHAR(255) NULL,
      status VARCHAR(32) NOT NULL,
      start_date DATETIME NOT NULL,
      end_date DATETIME NOT NULL,
      last_check_at DATETIME NULL,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      INDEX idx_license_user (user_id),
      INDEX idx_license_product (product_id),
      CONSTRAINT fk_license_user FOREIGN KEY (user_id) REFERENCES users(id),
      CONSTRAINT fk_license_product FOREIGN KEY (product_id) REFERENCES products(id)
    ) ENGINE=InnoDB;

    CREATE TABLE IF NOT EXISTS payments (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      product_id VARCHAR(64) NOT NULL,
      amount_usd INT NOT NULL,
      provider_ref VARCHAR(255) NULL,
      status VARCHAR(32) NOT NULL,
      created_at DATETIME NOT NULL,
      INDEX idx_payment_user (user_id),
      INDEX idx_payment_product (product_id),
      CONSTRAINT fk_payment_user FOREIGN KEY (user_id) REFERENCES users(id),
      CONSTRAINT fk_payment_product FOREIGN KEY (product_id) REFERENCES products(id)
    ) ENGINE=InnoDB;

    CREATE TABLE IF NOT EXISTS license_events (
      id VARCHAR(64) PRIMARY KEY,
      license_id VARCHAR(64) NOT NULL,
      event_type VARCHAR(64) NOT NULL,
      metadata_json JSON NULL,
      created_at DATETIME NOT NULL,
      INDEX idx_event_license (license_id),
      CONSTRAINT fk_event_license FOREIGN KEY (license_id) REFERENCES licenses(id)
    ) ENGINE=InnoDB;

    CREATE TABLE IF NOT EXISTS admin_users (
      id VARCHAR(64) PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(32) NOT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL
    ) ENGINE=InnoDB;

    CREATE TABLE IF NOT EXISTS product_assets (
      id VARCHAR(64) PRIMARY KEY,
      product_id VARCHAR(64) NOT NULL,
      original_name VARCHAR(255) NOT NULL,
      stored_name VARCHAR(255) NOT NULL,
      mime_type VARCHAR(128) NOT NULL,
      file_size BIGINT NOT NULL,
      file_path TEXT NOT NULL,
      checksum_sha256 VARCHAR(128) NULL,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      UNIQUE KEY uk_product_asset_product (product_id),
      CONSTRAINT fk_product_asset_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `);

  await ensureColumn('products', 'description', 'description TEXT NULL');
  await ensureColumn('products', 'runtime_type', "runtime_type VARCHAR(32) NOT NULL DEFAULT 'python'");
  await ensureColumn('products', 'is_active', 'is_active TINYINT(1) NOT NULL DEFAULT 1');
  await ensureColumn('users', 'password_hash', 'password_hash VARCHAR(255) NULL');
  await ensureColumn('users', 'full_name', 'full_name VARCHAR(255) NULL');

  const [existingProducts] = await pool.query(
    'SELECT id FROM products WHERE slug = ? LIMIT 1',
    ['simple-inventory']
  );

  if (existingProducts.length === 0) {
    await pool.query(
      'INSERT INTO products (id, name, slug, price_usd, created_at) VALUES (?, ?, ?, ?, ?)',
      [
        'prod_simple_inventory',
        'Simple Inventory',
        'simple-inventory',
        49,
        new Date()
      ]
    );
  }

  const [admins] = await pool.query('SELECT id FROM admin_users WHERE email = ? LIMIT 1', [seedAdminEmail]);
  if (admins.length === 0) {
    const passwordHash = await bcrypt.hash(seedAdminPassword, 12);
    await pool.query(
      'INSERT INTO admin_users (id, email, password_hash, role, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [uuidv4(), seedAdminEmail, passwordHash, 'super_admin', 1, new Date(), new Date()]
    );
  }
}

function getDb() {
  if (!pool) {
    throw new Error('Database pool is not initialized. Call initDb() first.');
  }
  return pool;
}

async function closeDb() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = {
  initDb,
  getDb,
  closeDb
};
