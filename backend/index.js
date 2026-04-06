/**
 * ZORO9X Backend API Server
 * 
 * Main entry point for the Express server
 * Handles authentication, database connections, and API routes
 */

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const net = require('net');
require('dotenv').config();
const passport = require('./config/passport');
const { initializeDatabase } = require('./config/database');
const { createUserTable, createPortfolioTable } = require('./config/schema');
const { createAdminTable } = require('./config/adminSchema');
const { initializeClientTables } = require('./config/clientSchema');
const { migrate } = require('./migrations/add_admin_columns');
const { migrate: migrateUserIdToClients } = require('./migrations/add_user_id_to_clients');
const { initializeSaaSTables, seedInitialSystems, seedInitialPlans } = require('./config/saasSchema');
const authRoutes = require('./routes/auth');
const oauthRoutes = require('./routes/oauth');
const adminRoutes = require('./routes/admin');
const portfolioRoutes = require('./routes/portfolio');
const saasRoutes = require('./routes/saas');
const clientRoutes = require('./routes/clients');
const quotationRoutes = require('./routes/quotations');
const invoiceRoutes = require('./routes/invoices');

const app = express();
const PORT = process.env.PORT || 5000;
const DEFAULT_FRONTEND_ORIGINS = ['https://www.zoro9x.com', 'https://zoro9x.com'];
const FRONTEND_ORIGINS = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map((origin) => origin.trim()).filter(Boolean)
  : DEFAULT_FRONTEND_ORIGINS;

const normalizeOrigin = (value) => {
  if (!value) {
    return value;
  }

  return value.replace(/^https:\/\/www\./i, 'https://').replace(/^http:\/\/www\./i, 'http://');
};

const ALLOWED_ORIGINS = new Set([
  ...FRONTEND_ORIGINS,
  ...FRONTEND_ORIGINS.map(normalizeOrigin),
  ...FRONTEND_ORIGINS.map((origin) => origin.replace(/^https:\/\//i, 'https://www.')).filter(Boolean),
  ...FRONTEND_ORIGINS.map((origin) => origin.replace(/^http:\/\//i, 'http://www.')).filter(Boolean)
]);

async function ensurePortIsAvailable(port) {
  return new Promise((resolve, reject) => {
    const tester = net
      .createServer()
      .once('error', (error) => {
        if (error && error.code === 'EADDRINUSE') {
          reject(new Error(`Port ${port} is already in use`));
          return;
        }

        reject(error);
      })
      .once('listening', () => {
        tester.close(() => resolve(true));
      });

    tester.listen(port);
  });
}

// ============================================
// SESSION MIDDLEWARE
// ============================================
// Configure session for OAuth authentication
app.use(session({
  secret: process.env.SESSION_SECRET || 'your_session_secret_change_this_in_production_98765432',
  resave: false,
  saveUninitialized: true,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// ============================================
// GLOBAL MIDDLEWARE
// ============================================
// CORS Configuration - Allow requests from frontend
app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser clients and same-origin server-to-server calls.
    if (!origin || ALLOWED_ORIGINS.has(origin) || ALLOWED_ORIGINS.has(normalizeOrigin(origin))) {
      return callback(null, true);
    }

    return callback(new Error(`Origin not allowed by CORS: ${origin}`));
  },
  credentials: true,
  exposedHeaders: ['Content-Disposition', 'Content-Type', 'Content-Length']
}));

// Parse JSON request bodies
app.use(express.json());

// Parse URL-encoded request bodies
app.use(express.urlencoded({ extended: true }));

// Serve static files (uploaded images)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ============================================
// PASSPORT AUTHENTICATION
// ============================================
// Initialize Passport for OAuth authentication
app.use(passport.initialize());
app.use(passport.session());

// ============================================
// HEALTH CHECK ENDPOINTS
// ============================================
// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to ZORO9X Backend API',
    version: '1.0.0',
    status: 'running'
  });
});

// Health check endpoint (for monitoring)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ============================================
// API ROUTES
// ============================================
// Authentication routes (login, register, profile)
app.use('/api/auth', authRoutes);

// OAuth routes (Google login, callback)
app.use('/api/oauth', oauthRoutes);

// Admin routes (admin login, admin dashboard)
app.use('/api/admin', adminRoutes);

// Portfolio routes (public and admin)
app.use('/api/portfolio', portfolioRoutes);

// SaaS routes (systems, subscriptions, admin)
app.use('/api/saas', saasRoutes);

// Client management routes
app.use('/api/clients', clientRoutes);

// Quotation management routes
app.use('/api/quotations', quotationRoutes);

// Invoice management routes
app.use('/api/invoices', invoiceRoutes);

// ============================================
// ERROR HANDLING MIDDLEWARE
// ============================================
// Catch-all error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({ 
    message: err.message || 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// ============================================
// 404 NOT FOUND HANDLER
// ============================================
// Handle undefined routes
app.use((req, res) => {
  res.status(404).json({ 
    message: 'Route not found',
    path: req.originalUrl 
  });
});

// ============================================
// SERVER INITIALIZATION
// ============================================
/**
 * Start the server and initialize database
 */
async function startServer() {
  try {
    console.log('🔄 Initializing ZORO9X Backend...');

    // Step 0: Fail fast if another backend instance is already running.
    await ensurePortIsAvailable(PORT);

    // Step 1: Connect to database
    const dbConnected = await initializeDatabase();
    if (!dbConnected) {
      console.error('❌ Failed to connect to database');
      process.exit(1);
    }

    // Step 2: Create users table if not exists
    await createUserTable();

    // Step 3: Create admin table and default admin if not exists
    await createAdminTable();

    // Step 3.5: Run migrations
    await migrate();

    // Step 4: Create portfolio table if not exists
    await createPortfolioTable();

    // Step 5: Initialize client, quotation, and invoice tables
    await initializeClientTables();
    
    // Step 5.5: Run client table migration
    await migrateUserIdToClients();

    // Step 6: Initialize SaaS tables and seed initial data
    await initializeSaaSTables();
    await seedInitialSystems();
    await seedInitialPlans();

    // Step 7: Start the Express server
    const server = app.listen(PORT, () => {
      console.log(`\n${'='.repeat(50)}`);
      console.log(`🚀 ZORO9X Backend Server Started`);
      console.log(`${'='.repeat(50)}`);
      console.log(`📍 Server URL: http://localhost:${PORT}`);
      console.log(`🌐 Allowed Frontend Origins: ${FRONTEND_ORIGINS.join(', ')}`);
      console.log(`📦 Node Environment: ${process.env.NODE_ENV}`);
      console.log(`📊 Database: ${process.env.DB_NAME}`);
      console.log(`${'='.repeat(50)}\n`);
    });

    server.on('error', (error) => {
      if (error && error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use. Stop the existing backend process and try again.`);
        process.exit(1);
        return;
      }

      console.error('❌ Server failed to start:', error);
      process.exit(1);
    });
  } catch (error) {
    if (error?.message?.includes('already in use')) {
      console.error(`❌ ${error.message}. Another backend instance is already running.`);
      process.exit(1);
      return;
    }

    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⛔ Shutting down gracefully...');
  process.exit(0);
});
