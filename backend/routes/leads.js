const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getAllLeads, getLeadById, createLead, updateLead, deleteLead } = require('../controllers/leadsController');
const { verifyAdminToken, verifyToken } = require('../middleware/auth');

// Ensure uploads/leads exists
const leadsDir = path.join(__dirname, '../uploads/leads');
if (!fs.existsSync(leadsDir)) {
  fs.mkdirSync(leadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, leadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'lead-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 6 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) return cb(null, true);
    cb(new Error('Only image files are allowed'));
  }
});

// List leads (admin only)
router.get('/', verifyAdminToken, getAllLeads);

// Create lead (admin only) - supports image upload
router.post('/', verifyAdminToken, upload.single('image'), createLead);

// Get single lead
router.get('/:id', verifyAdminToken, getLeadById);

// Update lead
router.put('/:id', verifyAdminToken, upload.single('image'), updateLead);

// Delete lead
router.delete('/:id', verifyAdminToken, deleteLead);

module.exports = router;
