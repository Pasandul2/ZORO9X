/**
 * SaaS Routes
 * 
 * API routes for SaaS system management
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const saasController = require('../controllers/saasController');
const { authenticateToken } = require('../middleware/auth');
const { authenticateAdmin } = require('../middleware/auth');

// Configure multer for logo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/logos'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// ============================================
// PUBLIC ROUTES - Systems Marketplace
// ============================================

/**
 * GET /api/saas/systems
 * Get all available systems
 */
router.get('/systems', saasController.getAllSystems);

/**
 * GET /api/saas/systems/:id
 * Get system details with plans
 */
router.get('/systems/:id', saasController.getSystemById);

/**
 * GET /api/saas/systems/:systemId/plans
 * Get subscription plans for a system
 */
router.get('/systems/:systemId/plans', saasController.getSystemPlans);

// ============================================
// PROTECTED USER ROUTES - Subscription Management
// ============================================

/**
 * POST /api/saas/subscribe
 * Purchase a system subscription
 * Requires authentication
 */
router.post('/subscribe', authenticateToken, saasController.purchaseSubscription);

/**
 * GET /api/saas/my-subscriptions
 * Get current user's subscriptions
 * Requires authentication
 */
router.get('/my-subscriptions', authenticateToken, saasController.getMySubscriptions);

/**
 * GET /api/saas/subscriptions/:id
 * Get specific subscription details
 * Requires authentication
 */
router.get('/subscriptions/:id', authenticateToken, saasController.getSubscriptionById);

/**
 * PUT /api/saas/subscriptions/:id/cancel
 * Cancel a subscription
 * Requires authentication
 */
router.put('/subscriptions/:id/cancel', authenticateToken, saasController.cancelSubscription);

/**
 * GET /api/saas/subscriptions/:subscriptionId/usage
 * Get API usage statistics for a subscription
 * Requires authentication
 */
router.get('/subscriptions/:subscriptionId/usage', authenticateToken, saasController.getApiUsageStats);

/**
 * GET /api/saas/subscriptions/:subscriptionId/security
 * Get security information for a subscription
 * Requires authentication
 */
router.get('/subscriptions/:subscriptionId/security', authenticateToken, saasController.getSecurityInfo);

/**
 * GET /api/saas/download/:subscriptionId
 * Download system application
 * Requires authentication
 */
router.get('/download/:subscriptionId', authenticateToken, saasController.downloadSystem);

/**
 * POST /api/saas/generate-custom-system
 * Generate customized system with business branding
 * Requires authentication
 */
router.post('/generate-custom-system', authenticateToken, upload.single('logo'), saasController.generateCustomSystem);

// ============================================
// API KEY VALIDATION & DEVICE ACTIVATION
// ============================================

/**
 * POST /api/saas/activate-device
 * Activate a new device for a subscription
 */
router.post('/activate-device', saasController.activateDevice);

/**
 * POST /api/saas/validate-key
 * Validate API key, check device, and log usage
 */
router.post('/validate-key', saasController.validateApiKey);

// ============================================
// ADMIN ROUTES - System Management
// ============================================

/**
 * GET /api/saas/admin/dashboard
 * Get admin dashboard statistics
 * Requires admin authentication
 */
router.get('/admin/dashboard', authenticateToken, authenticateAdmin, saasController.getDashboardStats);

/**
 * GET /api/saas/admin/clients
 * Get all clients and their subscriptions
 * Requires admin authentication
 */
router.get('/admin/clients', authenticateToken, authenticateAdmin, saasController.getAllClientsAndSubscriptions);

/**
 * POST /api/saas/admin/systems
 * Create a new system
 * Requires admin authentication
 */
router.post('/admin/systems', authenticateToken, authenticateAdmin, saasController.createSystem);

/**
 * PUT /api/saas/admin/systems/:id
 * Update a system
 * Requires admin authentication
 */
router.put('/admin/systems/:id', authenticateToken, authenticateAdmin, saasController.updateSystem);

/**
 * DELETE /api/saas/admin/systems/:id
 * Delete a system
 * Requires admin authentication
 */
router.delete('/admin/systems/:id', authenticateToken, authenticateAdmin, saasController.deleteSystem);

/**
 * POST /api/saas/admin/plans
 * Create a new subscription plan
 * Requires admin authentication
 */
router.post('/admin/plans', authenticateToken, authenticateAdmin, saasController.createPlan);

/**
 * PUT /api/saas/admin/plans/:id
 * Update a subscription plan
 * Requires admin authentication
 */
router.put('/admin/plans/:id', authenticateToken, authenticateAdmin, saasController.updatePlan);

/**
 * DELETE /api/saas/admin/plans/:id
 * Delete a subscription plan
 * Requires admin authentication
 */
router.delete('/admin/plans/:id', authenticateToken, authenticateAdmin, saasController.deletePlan);

// ============================================
// ADMIN ROUTES - Security Management
// ============================================

/**
 * GET /api/saas/admin/security/alerts
 * Get all security alerts
 * Requires admin authentication
 */
router.get('/admin/security/alerts', authenticateToken, authenticateAdmin, saasController.getSecurityAlerts);

/**
 * GET /api/saas/admin/security/devices
 * Get pending device activations
 * Requires admin authentication
 */
router.get('/admin/security/devices', authenticateToken, authenticateAdmin, saasController.getPendingDevices);

/**
 * POST /api/saas/admin/security/devices/:id/approve
 * Approve a device activation
 * Requires admin authentication
 */
router.post('/admin/security/devices/:id/approve', authenticateToken, authenticateAdmin, saasController.approveDevice);

/**
 * POST /api/saas/admin/security/devices/:id/reject
 * Reject a device activation
 * Requires admin authentication
 */
router.post('/admin/security/devices/:id/reject', authenticateToken, authenticateAdmin, saasController.rejectDevice);

/**
 * POST /api/saas/admin/security/alerts/:id/resolve
 * Resolve a security alert
 * Requires admin authentication
 */
router.post('/admin/security/alerts/:id/resolve', authenticateToken, authenticateAdmin, saasController.resolveSecurityAlert);

/**
 * GET /api/saas/admin/security/subscriptions/:id/devices
 * Get all devices for a subscription
 * Requires admin authentication
 */
router.get('/admin/security/subscriptions/:id/devices', authenticateToken, authenticateAdmin, saasController.getSubscriptionDevices);

// ============================================
// DATABASE SYNC ROUTES (No authentication - uses API key)
// ============================================

/**
 * POST /api/saas/sync/to-server
 * Sync data from client to server (backup)
 * Requires API key in request body
 */
router.post('/sync/to-server', saasController.syncToServer);

/**
 * POST /api/saas/sync/from-server
 * Sync data from server to client (restore)
 * Requires API key in request body
 */
router.post('/sync/from-server', saasController.syncFromServer);

/**
 * GET /api/saas/sync/tables
 * Get all tables from remote database
 * Requires API key in query string
 */
router.get('/sync/tables', saasController.getRemoteTables);

module.exports = router;
