/**
 * Coupon Routes
 * 
 * Endpoints for coupon management
 */

const express = require('express');
const router = express.Router();
const { authenticateToken, authenticateAdmin } = require('../middleware/auth');
const couponController = require('../controllers/couponController');

// Public routes
router.post('/validate', couponController.validateCoupon);

// Protected user routes
router.post('/apply', authenticateToken, couponController.applyCoupon);

// Admin routes
router.post('/', authenticateAdmin, couponController.createCoupon);
router.get('/', authenticateAdmin, couponController.getAllCoupons);
router.put('/:id', authenticateAdmin, couponController.updateCoupon);
router.delete('/:id', authenticateAdmin, couponController.deleteCoupon);
router.get('/:id/redemptions', authenticateAdmin, couponController.getCouponRedemptions);

module.exports = router;
