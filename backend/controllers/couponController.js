/**
 * Coupon Controller
 * 
 * Manages discount coupons and redemptions
 */

const { pool } = require('../config/database');
const { applyStripeCoupon } = require('../services/stripeService');
const { logAudit } = require('../services/auditService');

/**
 * Create coupon
 */
exports.createCoupon = async (req, res) => {
  try {
    const {
      code,
      discountType,
      discountValue,
      maxRedemptions,
      validFrom,
      validUntil,
      minPurchaseAmount,
      applicablePlans
    } = req.body;
    
    const connection = await pool.getConnection();
    
    // Check if code already exists
    const [existing] = await connection.execute(
      'SELECT id FROM coupons WHERE code = ?',
      [code]
    );
    
    if (existing.length > 0) {
      connection.release();
      return res.status(400).json({ error: 'Coupon code already exists' });
    }
    
    // Create coupon
    const [result] = await connection.execute(
      `INSERT INTO coupons 
       (code, discount_type, discount_value, max_redemptions, valid_from, valid_until, 
        min_purchase_amount, applicable_plans, is_active) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, true)`,
      [
        code.toUpperCase(),
        discountType,
        discountValue,
        maxRedemptions || null,
        validFrom || null,
        validUntil || null,
        minPurchaseAmount || 0,
        applicablePlans ? JSON.stringify(applicablePlans) : null
      ]
    );
    
    connection.release();
    
    await logAudit({
      userId: req.admin.id,
      userType: 'admin',
      action: 'CREATE_COUPON',
      resourceType: 'coupon',
      resourceId: result.insertId,
      newValue: { code, discountType, discountValue },
      ipAddress: req.ip
    });
    
    res.json({
      message: 'Coupon created successfully',
      couponId: result.insertId
    });
    
  } catch (error) {
    console.error('Error creating coupon:', error);
    res.status(500).json({ error: 'Failed to create coupon' });
  }
};

/**
 * Get all coupons
 */
exports.getAllCoupons = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    const [coupons] = await connection.execute(
      `SELECT 
        c.*,
        COUNT(cr.id) as redemption_count
       FROM coupons c
       LEFT JOIN coupon_redemptions cr ON c.id = cr.coupon_id
       GROUP BY c.id
       ORDER BY c.created_at DESC`
    );
    
    connection.release();
    
    res.json(coupons);
    
  } catch (error) {
    console.error('Error getting coupons:', error);
    res.status(500).json({ error: 'Failed to get coupons' });
  }
};

/**
 * Validate coupon
 */
exports.validateCoupon = async (req, res) => {
  try {
    const { code, planId, amount } = req.body;
    
    const connection = await pool.getConnection();
    
    // Get coupon
    const [coupons] = await connection.execute(
      'SELECT * FROM coupons WHERE code = ? AND is_active = true',
      [code.toUpperCase()]
    );
    
    if (coupons.length === 0) {
      connection.release();
      return res.status(404).json({ valid: false, error: 'Invalid coupon code' });
    }
    
    const coupon = coupons[0];
    
    // Check validity period
    const now = new Date();
    if (coupon.valid_from && new Date(coupon.valid_from) > now) {
      connection.release();
      return res.status(400).json({ valid: false, error: 'Coupon not yet valid' });
    }
    
    if (coupon.valid_until && new Date(coupon.valid_until) < now) {
      connection.release();
      return res.status(400).json({ valid: false, error: 'Coupon has expired' });
    }
    
    // Check redemption limit
    if (coupon.max_redemptions) {
      if (coupon.redemption_count >= coupon.max_redemptions) {
        connection.release();
        return res.status(400).json({ valid: false, error: 'Coupon redemption limit reached' });
      }
    }
    
    // Check minimum purchase amount
    if (coupon.min_purchase_amount && amount < coupon.min_purchase_amount) {
      connection.release();
      return res.status(400).json({ 
        valid: false, 
        error: `Minimum purchase amount is $${coupon.min_purchase_amount}` 
      });
    }
    
    // Check applicable plans
    if (coupon.applicable_plans) {
      const plans = JSON.parse(coupon.applicable_plans);
      if (!plans.includes(planId)) {
        connection.release();
        return res.status(400).json({ valid: false, error: 'Coupon not applicable to this plan' });
      }
    }
    
    // Check if user already used this coupon
    const clientId = req.user?.id;
    if (clientId) {
      const [redemptions] = await connection.execute(
        'SELECT id FROM coupon_redemptions WHERE coupon_id = ? AND client_id = ?',
        [coupon.id, clientId]
      );
      
      if (redemptions.length > 0) {
        connection.release();
        return res.status(400).json({ valid: false, error: 'You have already used this coupon' });
      }
    }
    
    connection.release();
    
    // Calculate discount
    let discountAmount = 0;
    if (coupon.discount_type === 'percentage') {
      discountAmount = (amount * coupon.discount_value) / 100;
    } else {
      discountAmount = coupon.discount_value;
    }
    
    const finalAmount = Math.max(0, amount - discountAmount);
    
    res.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discountType: coupon.discount_type,
        discountValue: coupon.discount_value
      },
      originalAmount: amount,
      discountAmount: discountAmount,
      finalAmount: finalAmount
    });
    
  } catch (error) {
    console.error('Error validating coupon:', error);
    res.status(500).json({ error: 'Failed to validate coupon' });
  }
};

/**
 * Apply coupon (redeem)
 */
exports.applyCoupon = async (req, res) => {
  try {
    const { couponCode, subscriptionId } = req.body;
    const clientId = req.user.id;
    
    const connection = await pool.getConnection();
    
    // Get coupon
    const [coupons] = await connection.execute(
      'SELECT * FROM coupons WHERE code = ? AND is_active = true',
      [couponCode.toUpperCase()]
    );
    
    if (coupons.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Invalid coupon code' });
    }
    
    const coupon = coupons[0];
    
    // Get subscription
    const [subscriptions] = await connection.execute(
      'SELECT * FROM client_subscriptions WHERE id = ? AND client_id = ?',
      [subscriptionId, clientId]
    );
    
    if (subscriptions.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Subscription not found' });
    }
    
    // Record redemption
    await connection.execute(
      `INSERT INTO coupon_redemptions 
       (coupon_id, client_id, subscription_id, discount_amount) 
       VALUES (?, ?, ?, ?)`,
      [coupon.id, clientId, subscriptionId, 0] // discount_amount will be calculated
    );
    
    // Update coupon redemption count
    await connection.execute(
      'UPDATE coupons SET redemption_count = redemption_count + 1 WHERE id = ?',
      [coupon.id]
    );
    
    // Apply to Stripe if stripe_subscription_id exists
    if (subscriptions[0].stripe_subscription_id) {
      try {
        await applyStripeCoupon(
          subscriptions[0].stripe_subscription_id,
          coupon.discount_type,
          coupon.discount_value
        );
      } catch (stripeError) {
        console.error('Stripe error:', stripeError);
      }
    }
    
    connection.release();
    
    await logAudit({
      userId: clientId,
      userType: 'client',
      action: 'APPLY_COUPON',
      resourceType: 'coupon',
      resourceId: coupon.id,
      ipAddress: req.ip
    });
    
    res.json({
      message: 'Coupon applied successfully',
      coupon: {
        code: coupon.code,
        discountType: coupon.discount_type,
        discountValue: coupon.discount_value
      }
    });
    
  } catch (error) {
    console.error('Error applying coupon:', error);
    res.status(500).json({ error: 'Failed to apply coupon' });
  }
};

/**
 * Update coupon
 */
exports.updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const connection = await pool.getConnection();
    
    // Build update query
    const allowedFields = [
      'discount_type', 'discount_value', 'max_redemptions', 
      'valid_from', 'valid_until', 'min_purchase_amount', 
      'applicable_plans', 'is_active'
    ];
    
    const updateFields = [];
    const values = [];
    
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        values.push(
          field === 'applicable_plans' && updates[field] 
            ? JSON.stringify(updates[field]) 
            : updates[field]
        );
      }
    });
    
    if (updateFields.length === 0) {
      connection.release();
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    values.push(id);
    
    await connection.execute(
      `UPDATE coupons SET ${updateFields.join(', ')} WHERE id = ?`,
      values
    );
    
    connection.release();
    
    await logAudit({
      userId: req.admin.id,
      userType: 'admin',
      action: 'UPDATE_COUPON',
      resourceType: 'coupon',
      resourceId: id,
      newValue: updates,
      ipAddress: req.ip
    });
    
    res.json({ message: 'Coupon updated successfully' });
    
  } catch (error) {
    console.error('Error updating coupon:', error);
    res.status(500).json({ error: 'Failed to update coupon' });
  }
};

/**
 * Delete coupon
 */
exports.deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    
    const connection = await pool.getConnection();
    
    await connection.execute('DELETE FROM coupons WHERE id = ?', [id]);
    
    connection.release();
    
    await logAudit({
      userId: req.admin.id,
      userType: 'admin',
      action: 'DELETE_COUPON',
      resourceType: 'coupon',
      resourceId: id,
      ipAddress: req.ip
    });
    
    res.json({ message: 'Coupon deleted successfully' });
    
  } catch (error) {
    console.error('Error deleting coupon:', error);
    res.status(500).json({ error: 'Failed to delete coupon' });
  }
};

/**
 * Get coupon redemptions
 */
exports.getCouponRedemptions = async (req, res) => {
  try {
    const { id } = req.params;
    
    const connection = await pool.getConnection();
    
    const [redemptions] = await connection.execute(
      `SELECT 
        cr.*,
        c.company_name,
        c.company_email,
        ss.name as system_name
       FROM coupon_redemptions cr
       JOIN clients c ON cr.client_id = c.id
       JOIN client_subscriptions cs ON cr.subscription_id = cs.id
       JOIN saas_systems ss ON cs.system_id = ss.id
       WHERE cr.coupon_id = ?
       ORDER BY cr.redeemed_at DESC`,
      [id]
    );
    
    connection.release();
    
    res.json(redemptions);
    
  } catch (error) {
    console.error('Error getting coupon redemptions:', error);
    res.status(500).json({ error: 'Failed to get coupon redemptions' });
  }
};
