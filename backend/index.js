/**
 * ZORO9X Backend API Server
 * 
 * Main entry point for the Express server
 * Handles authentication, database connections, and API routes
 */

const express = require('express');
const cors = require('cors');
const session = require('express-session');
require('dotenv').config();
const passport = require('./config/passport');
const { initializeDatabase } = require('./config/database');
const { createUserTable } = require('./config/schema');
const { createAdminTable } = require('./config/adminSchema');
const { initializeSaaSTables, seedInitialSystems, seedInitialPlans } = require('./config/saasSchema');
const { initializeExtendedTables } = require('./config/extendedSaasSchema');
const authRoutes = require('./routes/auth');
const oauthRoutes = require('./routes/oauth');
const adminRoutes = require('./routes/admin');
const saasRoutes = require('./routes/saas');
const couponRoutes = require('./routes/coupon');
const invoiceRoutes = require('./routes/invoice');
const twoFactorRoutes = require('./routes/twoFactor');

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

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
  origin: FRONTEND_URL,
  credentials: true
}));

// Parse JSON request bodies
app.use(express.json());

// Parse URL-encoded request bodies
app.use(express.urlencoded({ extended: true }));

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

// SaaS routes (systems, subscriptions, clients)
app.use('/api/saas', saasRoutes);

// Coupon routes (discount management)
app.use('/api/coupons', couponRoutes);

// Invoice routes (billing and invoicing)
app.use('/api/invoices', invoiceRoutes);

// Two-Factor Authentication routes
app.use('/api/2fa', twoFactorRoutes);

// ============================================
// ERROR HANDLING MIDDLEWARE
// ============================================
// Catch-all error handler
app.use((err, req, res) => {
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

    // Step 4: Initialize SaaS tables and seed initial data
    await initializeSaaSTables();
    await seedInitialSystems();
    await seedInitialPlans();

    // Step 5: Initialize extended SaaS tables (coupons, invoices, 2FA, etc.)
    await initializeExtendedTables();

    // Step 6: Start the Express server
    app.listen(PORT, () => {
      console.log(`\n${'='.repeat(50)}`);
      console.log(`🚀 ZORO9X Backend Server Started`);
      console.log(`${'='.repeat(50)}`);
      console.log(`📍 Server URL: http://localhost:${PORT}`);
      console.log(`🌐 Frontend URL: ${FRONTEND_URL}`);
      console.log(`📦 Node Environment: ${process.env.NODE_ENV}`);
      console.log(`📊 Database: ${process.env.DB_NAME}`);
      console.log(`${'='.repeat(50)}\n`);
    });
  } catch (error) {
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
