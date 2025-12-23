/**
 * OAuth Routes
 * 
 * Handles Google OAuth authentication flow
 * 
 * Routes:
 * - GET /google - Initiates Google OAuth login
 * - GET /google/callback - Google OAuth callback handler
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const passport = require('passport');

const router = express.Router();

// ============================================
// GOOGLE OAUTH LOGIN
// ============================================
/**
 * GET /api/oauth/google
 * Redirects user to Google login page
 * Scopes: profile, email
 */
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// ============================================
// GOOGLE OAUTH CALLBACK
// ============================================
/**
 * GET /api/oauth/google/callback
 * Handles callback from Google after user login
 * Authenticates user, creates account if new, generates JWT
 */
router.get(
  '/google/callback',
  passport.authenticate('google', { 
    failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=auth_failed` 
  }),
  (req, res) => {
    try {
      const user = req.user;

      // ============================================
      // GENERATE JWT TOKEN
      // ============================================
      // Create JWT token valid for 7 days
      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET || 'your_jwt_secret_key_change_this_in_production_12345678',
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
      );

      // ============================================
      // REDIRECT TO FRONTEND WITH TOKEN
      // ============================================
      // Send token and user data to frontend via URL params
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(`${frontendUrl}/login?token=${token}&user=${encodeURIComponent(JSON.stringify(user))}`);
    } catch (error) {
      console.error('❌ Google callback error:', error.message);
      res.redirect(process.env.FRONTEND_URL + '/login?error=token_generation_failed');
    }
  }
);

module.exports = router;
