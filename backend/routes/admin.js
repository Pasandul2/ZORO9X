/**
 * Admin Authentication Routes
 * Handles admin login and profile endpoints
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
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
const { 
  generateSystem,
  getGeneratedSystems,
  deleteGeneratedSystem,
  regenerateSystem
} = require('../controllers/systemGenerator');
const { verifyToken } = require('../middleware/auth');

// ============================================
// MULTER CONFIGURATION FOR ICON UPLOADS
// ============================================

// Create uploads directory if it doesn't exist
const iconsDir = path.join(__dirname, '../uploads/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Configure multer for icon uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, iconsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'icon-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|svg|ico|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || file.mimetype === 'image/svg+xml' || file.mimetype === 'image/x-icon';
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (jpeg, jpg, png, gif, svg, ico, webp) are allowed'));
    }
  }
});

// Simple JSON-backed bank details storage (fallback if DB not used)
const configDir = path.join(__dirname, '..', 'config');
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
}
const bankConfigPath = path.join(configDir, 'bank_details.json');
const _readBankConfig = () => {
  try {
    if (!fs.existsSync(bankConfigPath)) return null;
    const raw = fs.readFileSync(bankConfigPath, 'utf8');
    return JSON.parse(raw || '{}');
  } catch (err) {
    console.error('Failed to read bank details config:', err);
    return null;
  }
};
const _writeBankConfig = (data) => {
  try {
    fs.writeFileSync(bankConfigPath, JSON.stringify(data || {}, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Failed to write bank details config:', err);
    return false;
  }
};

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

// ============================================
// SYSTEM GENERATOR ROUTES
// ============================================

/**
 * @route   POST /api/admin/generate-system
 * @desc    Auto-generate new system with Basic & Premium versions
 * @access  Private (Admin only)
 * @field   icon - Optional file upload for system icon
 */
router.post('/generate-system', 
  verifyToken, 
  (req, res, next) => {
    console.log('🔍 Before multer - Content-Type:', req.get('content-type'));
    console.log('🔍 Before multer - Body:', req.body);
    next();
  },
  upload.single('icon'),
  (req, res, next) => {
    console.log('🔍 After multer - Has file:', !!req.file);
    console.log('🔍 After multer - Body:', req.body);
    console.log('🔍 After multer - Body keys:', Object.keys(req.body));
    next();
  },
  generateSystem
);

/**
 * @route   GET /api/admin/generated-systems
 * @desc    Get all generated systems
 * @access  Private (Admin only)
 */
router.get('/generated-systems', verifyToken, getGeneratedSystems);

/**
 * @route   DELETE /api/admin/generated-systems/:id
 * @desc    Delete generated system and its files
 * @access  Private (Admin only)
 */
router.delete('/generated-systems/:id', verifyToken, deleteGeneratedSystem);

/**
 * @route   POST /api/admin/generated-systems/:id/regenerate
 * @desc    Regenerate system files
 * @access  Private (Admin only)
 */
router.post('/generated-systems/:id/regenerate', verifyToken, regenerateSystem);

/**
 * GET /api/admin/bank-details
 * Return configured bank transfer details for client renewal page
 */
router.get('/bank-details', verifyToken, (req, res) => {
  try {
    const cfg = _readBankConfig() || {};
    return res.json({ success: true, bank_details: cfg });
  } catch (err) {
    console.error('Error reading bank details:', err);
    return res.status(500).json({ success: false, message: 'Failed to read bank details' });
  }
});

/**
 * PUT /api/admin/bank-details
 * Save bank transfer details (admin only)
 */
router.put('/bank-details', verifyToken, express.json(), (req, res) => {
  try {
    const body = req.body || {};
    const cfg = {
      bank_name: (body.bank_name || '').toString(),
      account_no: (body.account_no || '').toString(),
      account_name: (body.account_name || '').toString(),
      branch: (body.branch || '').toString(),
      swift: (body.swift || '').toString(),
      instructions: (body.instructions || '').toString(),
    };
    const ok = _writeBankConfig(cfg);
    if (!ok) return res.status(500).json({ success: false, message: 'Failed to save bank details' });
    return res.json({ success: true, message: 'Bank details saved', bank_details: cfg });
  } catch (err) {
    console.error('Error saving bank details:', err);
    return res.status(500).json({ success: false, message: 'Failed to save bank details' });
  }
});

module.exports = router;

