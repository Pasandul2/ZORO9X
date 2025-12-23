/**
 * Portfolio Routes
 * Public routes for fetching portfolio
 * Admin routes for managing portfolio (protected)
 */

const express = require('express');
const router = express.Router();
const {
  getAllPortfolio,
  getPortfolioById,
  createPortfolio,
  updatePortfolio,
  deletePortfolio,
  uploadImage
} = require('../controllers/portfolioController');
const { verifyAdminToken } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public routes
router.get('/', getAllPortfolio);
router.get('/:id', getPortfolioById);

// Admin routes (protected)
router.post('/upload', verifyAdminToken, upload.single('image'), uploadImage);
router.post('/', verifyAdminToken, createPortfolio);
router.put('/:id', verifyAdminToken, updatePortfolio);
router.delete('/:id', verifyAdminToken, deletePortfolio);

module.exports = router;
