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
const { 
  register, 
  verifyEmail,
  resendVerificationCode,
  login, 
  forgotPassword,
  resetPassword,
  getProfile 
} = require('../controllers/authController');
const verifyToken = require('../middleware/auth');

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
 * POST /api/auth/verify-email
 * Verify email address with 6-digit code
 * Body: { email, code }
 */
router.post('/verify-email', verifyEmail);

/**
 * POST /api/auth/resend-verification
 * Resend verification code to email
 * Body: { email }
 */
router.post('/resend-verification', resendVerificationCode);

/**
 * POST /api/auth/login
 * Authenticate user and receive JWT token
 */
router.post('/login', login);

/**
 * POST /api/auth/forgot-password
 * Request password reset code
 * Body: { email }
 */
router.post('/forgot-password', forgotPassword);

/**
 * POST /api/auth/reset-password
 * Reset password with code
 * Body: { email, code, newPassword }
 */
router.post('/reset-password', resetPassword);

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

