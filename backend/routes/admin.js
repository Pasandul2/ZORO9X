/**
 * Admin Authentication Routes
 * Handles admin login and profile endpoints
 */

const express = require('express');
const router = express.Router();
const { 
  adminLogin, 
  getAdminProfile, 
  getAllUsers,
  getAllAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  resendAdminInvitation
} = require('../controllers/adminController');
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

/**
 * @route   GET /api/admin/users
 * @desc    Get all users (protected route)
 * @access  Private (requires admin JWT token)
 */
router.get('/users', verifyToken, getAllUsers);

/**
 * @route   GET /api/admin/admins
 * @desc    Get all admin users
 * @access  Private (Super Admin only)
 */
router.get('/admins', verifyToken, getAllAdmins);

/**
 * @route   POST /api/admin/admins
 * @desc    Create new admin user
 * @access  Private (Super Admin only)
 */
router.post('/admins', verifyToken, createAdmin);

/**
 * @route   PUT /api/admin/admins/:id
 * @desc    Update admin user details and permissions
 * @access  Private (Super Admin only)
 */
router.put('/admins/:id', verifyToken, updateAdmin);

/**
 * @route   DELETE /api/admin/admins/:id
 * @desc    Delete admin user
 * @access  Private (Super Admin only)
 */
router.delete('/admins/:id', verifyToken, deleteAdmin);

/**
 * @route   POST /api/admin/admins/:id/resend-invitation
 * @desc    Resend invitation email to admin
 * @access  Private (Super Admin only)
 */
router.post('/admins/:id/resend-invitation', verifyToken, resendAdminInvitation);

module.exports = router;
