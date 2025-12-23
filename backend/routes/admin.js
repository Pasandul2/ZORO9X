/**
 * Admin Authentication Routes
 * Handles admin login and profile endpoints
 */

const express = require('express');
const router = express.Router();
const { adminLogin, getAdminProfile } = require('../controllers/adminController');
const { verifyToken } = require('../middleware/auth');

/**
 * @route   POST /api/admin/login
 * @desc    Admin login with email and password
 * @access  Public
 */
router.post('/login', adminLogin);

/**
 * @route   GET /api/admin/profile
 * @desc    Get admin profile (protected route)
 * @access  Private (requires admin JWT token)
 */
router.get('/profile', verifyToken, getAdminProfile);

module.exports = router;
