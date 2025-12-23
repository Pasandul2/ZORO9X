/**
 * Authentication Routes
 * 
 * Public Routes:
 * - POST /register - Create new user account
 * - POST /verify-email - Verify email with code
 * - POST /resend-verification - Resend verification code
 * - POST /login - Login with email & password
 * - POST /forgot-password - Request password reset
 * - POST /reset-password - Reset password with code
 * 
 * Protected Routes (Require JWT Token):
 * - GET /profile - Get current user profile
 */

const express = require('express');
const { register, login, getProfile } = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// ============================================
// PUBLIC ROUTES (No authentication required)
// ============================================

/**
 * POST /api/auth/register
 * Create a new user account and send verification email
 */
router.post('/register', register);

/**
 * POST /api/auth/login
 * Authenticate user and receive JWT token
 */
router.post('/login', login);

// ============================================
// PROTECTED ROUTES (JWT token required)
// ============================================

/**
 * GET /api/auth/profile
 * Get logged-in user's profile data
 * Requires: Authorization: Bearer <token>
 */
router.get('/profile', verifyToken, getProfile);

module.exports = router;

