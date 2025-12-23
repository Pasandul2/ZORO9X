/**
 * SaaS Routes
 * 
 * API routes for SaaS system management
 */

const express = require('express');
const router = express.Router();
const saasController = require('../controllers/saasController');
const { authenticateToken } = require('../middleware/auth');
const { authenticateAdmin } = require('../middleware/auth');

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

// ============================================
// API KEY VALIDATION
// ============================================

/**
 * POST /api/saas/validate-key
 * Validate API key and log usage
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
router.get('/admin/dashboard', authenticateAdmin, saasController.getDashboardStats);

/**
 * GET /api/saas/admin/clients
 * Get all clients and their subscriptions
 * Requires admin authentication
 */
router.get('/admin/clients', authenticateAdmin, saasController.getAllClientsAndSubscriptions);

/**
 * POST /api/saas/admin/systems
 * Create a new system
 * Requires admin authentication
 */
router.post('/admin/systems', authenticateAdmin, saasController.createSystem);

/**
 * PUT /api/saas/admin/systems/:id
 * Update a system
 * Requires admin authentication
 */
router.put('/admin/systems/:id', authenticateAdmin, saasController.updateSystem);

/**
 * DELETE /api/saas/admin/systems/:id
 * Delete a system
 * Requires admin authentication
 */
router.delete('/admin/systems/:id', authenticateAdmin, saasController.deleteSystem);

/**
 * POST /api/saas/admin/plans
 * Create a new subscription plan
 * Requires admin authentication
 */
router.post('/admin/plans', authenticateAdmin, saasController.createPlan);

module.exports = router;
