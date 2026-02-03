/**
 * Client Routes
 * Defines all routes for client management
 */

const express = require('express');
const router = express.Router();
const {
  getAllClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  getClientStats
} = require('../controllers/clientController');
const { verifyAdminToken } = require('../middleware/auth');

// All routes require admin authentication
router.use(verifyAdminToken);

// GET all clients
router.get('/', getAllClients);

// GET client statistics
router.get('/stats', getClientStats);

// GET single client by ID
router.get('/:id', getClientById);

// POST create new client
router.post('/', createClient);

// PUT update client
router.put('/:id', updateClient);

// DELETE client
router.delete('/:id', deleteClient);

module.exports = router;
