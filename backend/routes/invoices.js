/**
 * Invoice Routes
 * Defines all routes for invoice management
 */

const express = require('express');
const router = express.Router();
const {
  getAllInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  recordPayment,
  getInvoiceStats
} = require('../controllers/invoiceController');
const { verifyAdminToken } = require('../middleware/auth');

// All routes require admin authentication
router.use(verifyAdminToken);

// GET all invoices
router.get('/', getAllInvoices);

// GET invoice statistics
router.get('/stats', getInvoiceStats);

// GET single invoice by ID
router.get('/:id', getInvoiceById);

// POST create new invoice
router.post('/', createInvoice);

// PUT update invoice
router.put('/:id', updateInvoice);

// POST record payment for invoice
router.post('/:id/payment', recordPayment);

// DELETE invoice
router.delete('/:id', deleteInvoice);

module.exports = router;
