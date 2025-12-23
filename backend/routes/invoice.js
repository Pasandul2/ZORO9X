/**
 * Invoice Routes
 * 
 * Endpoints for invoice management
 */

const express = require('express');
const router = express.Router();
const { authenticateToken, authenticateAdmin } = require('../middleware/auth');
const invoiceController = require('../controllers/invoiceController');

// Protected user routes
router.get('/my-invoices', authenticateToken, invoiceController.getClientInvoices);
router.get('/:id', authenticateToken, invoiceController.getInvoiceDetails);
router.get('/:id/download', authenticateToken, invoiceController.downloadInvoice);

// Admin routes
router.post('/', authenticateAdmin, invoiceController.createInvoice);
router.get('/', authenticateAdmin, invoiceController.getAllInvoices);
router.put('/:id/status', authenticateAdmin, invoiceController.updateInvoiceStatus);
router.post('/send-reminders', authenticateAdmin, invoiceController.sendOverdueReminders);

module.exports = router;
