/**
 * Two-Factor Authentication Routes
 * 
 * Endpoints for 2FA setup and verification
 */

const express = require('express');
const router = express.Router();
const { authenticateToken, authenticateAdmin } = require('../middleware/auth');
const twoFactorService = require('../services/twoFactorService');
const { logAudit } = require('../services/auditService');

/**
 * Setup 2FA (Generate secret and QR code)
 */
router.post('/setup', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userEmail = req.user.email;
    
    // Generate secret
    const secret = twoFactorService.generateSecret(userEmail);
    
    // Generate QR code
    const qrCode = await twoFactorService.generateQRCode(secret.otpauth_url);
    
    // Generate backup codes
    const backupCodes = twoFactorService.generateBackupCodes();
    
    res.json({
      secret: secret.base32,
      qrCode,
      backupCodes,
      message: 'Scan the QR code with your authenticator app and verify to enable 2FA'
    });
    
  } catch (error) {
    console.error('Error setting up 2FA:', error);
    res.status(500).json({ error: 'Failed to setup 2FA' });
  }
});

/**
 * Enable 2FA (Verify and activate)
 */
router.post('/enable', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { secret, token, backupCodes } = req.body;
    
    // Verify token
    const speakeasy = require('speakeasy');
    const isValid = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 2
    });
    
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }
    
    // Enable 2FA
    await twoFactorService.enable2FA(userId, 'client', secret, backupCodes);
    
    await logAudit({
      userId,
      userType: 'client',
      action: 'ENABLE_2FA',
      resourceType: '2fa',
      resourceId: userId,
      ipAddress: req.ip
    });
    
    res.json({ 
      message: '2FA enabled successfully',
      backupCodes 
    });
    
  } catch (error) {
    console.error('Error enabling 2FA:', error);
    res.status(500).json({ error: 'Failed to enable 2FA' });
  }
});

/**
 * Disable 2FA
 */
router.post('/disable', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { token } = req.body;
    
    // Verify token before disabling
    const verification = await twoFactorService.verifyToken(userId, 'client', token);
    
    if (!verification.valid) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }
    
    // Disable 2FA
    await twoFactorService.disable2FA(userId, 'client');
    
    await logAudit({
      userId,
      userType: 'client',
      action: 'DISABLE_2FA',
      resourceType: '2fa',
      resourceId: userId,
      ipAddress: req.ip
    });
    
    res.json({ message: '2FA disabled successfully' });
    
  } catch (error) {
    console.error('Error disabling 2FA:', error);
    res.status(500).json({ error: 'Failed to disable 2FA' });
  }
});

/**
 * Verify 2FA token
 */
router.post('/verify', async (req, res) => {
  try {
    const { userId, userType, token } = req.body;
    
    const verification = await twoFactorService.verifyToken(userId, userType, token);
    
    if (verification.valid) {
      res.json({ 
        valid: true,
        message: 'Token verified successfully',
        backupCodeUsed: verification.backupCodeUsed,
        remainingCodes: verification.remainingCodes
      });
    } else {
      res.status(400).json({ 
        valid: false,
        message: verification.message 
      });
    }
    
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(500).json({ error: 'Failed to verify token' });
  }
});

/**
 * Check 2FA status
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const enabled = await twoFactorService.is2FAEnabled(userId, 'client');
    
    res.json({ enabled });
    
  } catch (error) {
    console.error('Error checking 2FA status:', error);
    res.status(500).json({ error: 'Failed to check 2FA status' });
  }
});

/**
 * Get backup codes
 */
router.get('/backup-codes', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const backupCodes = await twoFactorService.getBackupCodes(userId, 'client');
    
    res.json({ backupCodes });
    
  } catch (error) {
    console.error('Error getting backup codes:', error);
    res.status(500).json({ error: 'Failed to get backup codes' });
  }
});

/**
 * Regenerate backup codes
 */
router.post('/regenerate-codes', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { token } = req.body;
    
    // Verify token before regenerating
    const verification = await twoFactorService.verifyToken(userId, 'client', token);
    
    if (!verification.valid) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }
    
    const newCodes = await twoFactorService.regenerateBackupCodes(userId, 'client');
    
    await logAudit({
      userId,
      userType: 'client',
      action: 'REGENERATE_2FA_CODES',
      resourceType: '2fa',
      resourceId: userId,
      ipAddress: req.ip
    });
    
    res.json({ 
      message: 'Backup codes regenerated successfully',
      backupCodes: newCodes 
    });
    
  } catch (error) {
    console.error('Error regenerating backup codes:', error);
    res.status(500).json({ error: 'Failed to regenerate backup codes' });
  }
});

module.exports = router;
