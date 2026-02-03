/**
 * Client Schema Configuration
 * Creates and manages the clients table structure for managing business clients
 */

const { pool } = require('./database');

/**
 * Creates the clients table if it doesn't exist
 * 
 * @returns {Promise<void>}
 */
const createClientTable = async () => {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS clients (
        id INT AUTO_INCREMENT PRIMARY KEY,
        client_name VARCHAR(255) NOT NULL,
        company_name VARCHAR(255),
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        address TEXT,
        country VARCHAR(100),
        tax_id VARCHAR(100),
        website VARCHAR(255),
        contact_person VARCHAR(255),
        payment_terms VARCHAR(50) DEFAULT 'Net 30',
        notes TEXT,
        status ENUM('active', 'inactive', 'archived') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_by INT,
        FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL
      )
    `;

    await pool.query(createTableQuery);
    console.log('✅ Clients table created/verified successfully!');

  } catch (error) {
    console.error('❌ Error creating clients table:', error);
    throw error;
  }
};

/**
 * Creates the quotations table if it doesn't exist
 * 
 * @returns {Promise<void>}
 */
const createQuotationTable = async () => {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS quotations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        quotation_number VARCHAR(50) NOT NULL UNIQUE,
        client_id INT NOT NULL,
        quotation_date DATE NOT NULL,
        valid_until DATE,
        items JSON NOT NULL,
        subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
        discount DECIMAL(10, 2) DEFAULT 0,
        total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
        payment_method TEXT,
        terms_conditions TEXT,
        notes TEXT,
        status ENUM('draft', 'sent', 'accepted', 'rejected', 'expired') DEFAULT 'draft',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_by INT,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL
      )
    `;

    await pool.query(createTableQuery);
    console.log('✅ Quotations table created/verified successfully!');

  } catch (error) {
    console.error('❌ Error creating quotations table:', error);
    throw error;
  }
};

/**
 * Creates the invoices table if it doesn't exist
 * 
 * @returns {Promise<void>}
 */
const createInvoiceTable = async () => {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS invoices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        invoice_number VARCHAR(50) NOT NULL UNIQUE,
        client_id INT NOT NULL,
        invoice_date DATE NOT NULL,
        due_date DATE,
        items JSON NOT NULL,
        subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
        discount DECIMAL(10, 2) DEFAULT 0,
        tax DECIMAL(10, 2) DEFAULT 0,
        total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
        paid_amount DECIMAL(10, 2) DEFAULT 0,
        payment_method TEXT,
        terms_conditions TEXT,
        notes TEXT,
        status ENUM('draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled') DEFAULT 'draft',
        quotation_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_by INT,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
        FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE SET NULL,
        FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL
      )
    `;

    await pool.query(createTableQuery);
    console.log('✅ Invoices table created/verified successfully!');

  } catch (error) {
    console.error('❌ Error creating invoices table:', error);
    throw error;
  }
};

/**
 * Initialize all client-related tables
 */
const initializeClientTables = async () => {
  await createClientTable();
  await createQuotationTable();
  await createInvoiceTable();
};

module.exports = {
  createClientTable,
  createQuotationTable,
  createInvoiceTable,
  initializeClientTables
};
