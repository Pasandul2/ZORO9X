/**
 * Quotation Routes
 * Defines all routes for quotation management
 */

const express = require('express');
const router = express.Router();
const {
  getAllQuotations,
  getQuotationById,
  createQuotation,
  updateQuotation,
  deleteQuotation,
  getQuotationStats
} = require('../controllers/quotationController');
const { verifyAdminToken } = require('../middleware/auth');

// All routes require admin authentication
router.use(verifyAdminToken);

// GET all quotations
router.get('/', getAllQuotations);

// GET quotation statistics
router.get('/stats', getQuotationStats);

// GET single quotation by ID
router.get('/:id', getQuotationById);

// POST create new quotation
router.post('/', createQuotation);

// PUT update quotation
router.put('/:id', updateQuotation);

// DELETE quotation
router.delete('/:id', deleteQuotation);

module.exports = router;
