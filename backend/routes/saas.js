/**
 * SaaS Routes
 * 
 * API routes for SaaS system management
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const saasController = require('../controllers/saasController');
const { authenticateToken } = require('../middleware/auth');
const { authenticateAdmin } = require('../middleware/auth');

// Ensure uploads/logos directory exists
const logosDir = path.join(__dirname, '../uploads/logos');
if (!fs.existsSync(logosDir)) {
  fs.mkdirSync(logosDir, { recursive: true });
}

const receiptsDir = path.join(__dirname, '../uploads/receipts');
if (!fs.existsSync(receiptsDir)) {
  fs.mkdirSync(receiptsDir, { recursive: true });
}

const backupsDir = path.join(__dirname, '../uploads/backups');
if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

// Configure multer for logo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, logosDir);
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
    const allowedTypes = /jpeg|jpg|png|gif|webp|bmp|svg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

const handleSystemIconUpload = (req, res, next) => {
  upload.single('icon')(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Invalid image upload'
      });
    }

    next();
  });
};

const handleBusinessLogoUpload = (req, res, next) => {
  upload.single('logo')(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Invalid logo upload'
      });
    }

    next();
  });
};

const receiptStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, receiptsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `receipt-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const receiptUpload = multer({
  storage: receiptStorage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|pdf|webp/;
    const extname = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimetype = /image\/jpeg|image\/jpg|image\/png|image\/webp|application\/pdf/.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    return cb(new Error('Only JPG, PNG, WEBP or PDF receipts are allowed'));
  },
});

const handleReceiptUpload = (req, res, next) => {
  receiptUpload.single('receipt')(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Invalid receipt upload',
      });
    }
    next();
  });
};

const backupStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const subscriptionId = req.params.subscriptionId || req.body.subscription_id || 'general';
    const backupTargetDir = path.join(backupsDir, `subscription_${subscriptionId}`);
    fs.mkdirSync(backupTargetDir, { recursive: true });
    cb(null, backupTargetDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase() || '.db';
    cb(null, `backup-${uniqueSuffix}${ext}`);
  },
});

const backupUpload = multer({
  storage: backupStorage,
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /db|sqlite|sqlite3/;
    const extname = allowed.test(path.extname(file.originalname).toLowerCase().replace('.', ''));
    if (extname) {
      return cb(null, true);
    }
    cb(new Error('Only database backup files are allowed'));
  },
});

const handleBackupUpload = (req, res, next) => {
  backupUpload.single('backup_file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Invalid backup upload',
      });
    }
    next();
  });
};

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
router.post('/subscribe', authenticateToken, handleBusinessLogoUpload, saasController.purchaseSubscription);

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
 * GET /api/saas/subscriptions/:subscriptionId/devices
 * Get active devices (including MAC addresses) for a subscription
 * Requires authentication
 */
router.get('/subscriptions/:subscriptionId/devices', authenticateToken, saasController.getClientSubscriptionDevices);

router.post('/subscriptions/:subscriptionId/renew-request', authenticateToken, handleReceiptUpload, saasController.submitRenewalRequest);
router.get('/subscriptions/:subscriptionId/renew-requests', authenticateToken, saasController.getSubscriptionRenewalRequests);

/**
 * GET /api/saas/subscriptions/:subscriptionId/business-info
 * Get business information + latest change request status
 * Requires authentication
 */
router.get('/subscriptions/:subscriptionId/business-info', authenticateToken, saasController.getBusinessInfoForSubscription);

/**
 * POST /api/saas/subscriptions/:subscriptionId/business-info/change-request
 * Submit business information change request
 * Requires authentication
 */
router.post('/subscriptions/:subscriptionId/business-info/change-request', authenticateToken, handleBusinessLogoUpload, saasController.requestBusinessInfoUpdate);

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
router.post('/heartbeat', saasController.heartbeat);
router.post('/shutdown', saasController.shutdown);

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
router.get('/admin/subscriptions', authenticateToken, authenticateAdmin, saasController.getAllSubscriptionsAdmin);
router.get('/admin/subscriptions/:id/dashboard', authenticateToken, authenticateAdmin, saasController.getSubscriptionDashboardAdmin);
router.post('/admin/subscriptions/:id/manage', authenticateToken, authenticateAdmin, saasController.manageSubscriptionAdmin);
router.patch('/admin/subscriptions/:id/status', authenticateToken, authenticateAdmin, saasController.setSubscriptionStatusAdmin);
router.get('/admin/renewal-requests', authenticateToken, authenticateAdmin, saasController.getRenewalRequestsAdmin);
router.post('/admin/renewal-requests/:requestId/review', authenticateToken, authenticateAdmin, saasController.reviewRenewalRequestAdmin);

/**
 * GET /api/saas/admin/business-info-requests
 * List business information change requests
 * Requires admin authentication
 */
router.get('/admin/business-info-requests', authenticateToken, authenticateAdmin, saasController.getBusinessInfoRequests);

/**
 * POST /api/saas/admin/business-info-requests/:requestId/review
 * Approve or reject business information change request
 * Requires admin authentication
 */
router.post('/admin/business-info-requests/:requestId/review', authenticateToken, authenticateAdmin, saasController.reviewBusinessInfoRequest);

/**
 * GET /api/saas/admin/systems
 * Get all systems (including inactive)
 * Requires admin authentication
 */
router.get('/admin/systems', authenticateToken, authenticateAdmin, saasController.getAllSystemsAdmin);

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
router.put('/admin/systems/:id', authenticateToken, authenticateAdmin, handleSystemIconUpload, saasController.updateSystem);

/**
 * POST /api/saas/admin/systems/:id/generate-build
 * Regenerate executable builds for a system and replace old dist/build artifacts
 * Requires admin authentication
 */
router.post('/admin/systems/:id/generate-build', authenticateToken, authenticateAdmin, saasController.generateSystemBuildAdmin);


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
 * POST /api/saas/admin/security/devices/:id/revoke
 * Revoke an active device
 * Requires admin authentication
 */
router.post('/admin/security/devices/:id/revoke', authenticateToken, authenticateAdmin, saasController.revokeDevice);

/**
 * GET /api/saas/admin/audit-logs
 * Get audit trail entries - Requires admin authentication
 */
router.get('/admin/audit-logs', authenticateToken, authenticateAdmin, saasController.getAuditLogs);

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
 * POST /api/saas/subscriptions/:subscriptionId/backups/upload
 * Upload a backup file to the server
 */
router.post('/subscriptions/:subscriptionId/backups/upload', handleBackupUpload, saasController.uploadSubscriptionBackup);

/**
 * GET /api/saas/subscriptions/:subscriptionId/backups
 * List server backups for the client dashboard
 */
router.get('/subscriptions/:subscriptionId/backups', authenticateToken, saasController.getSubscriptionBackups);

/**
 * GET /api/saas/subscriptions/:subscriptionId/backups/:backupId/download
 * Download a specific backup file
 */
router.get('/subscriptions/:subscriptionId/backups/:backupId/download', authenticateToken, saasController.downloadSubscriptionBackup);

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
