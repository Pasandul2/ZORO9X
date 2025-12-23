/**
 * Two-Factor Authentication Service
 * 
 * Handles 2FA setup and verification
 */

const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { pool } = require('../config/database');

/**
 * Generate 2FA secret
 */
function generateSecret(userEmail) {
  const secret = speakeasy.generateSecret({
    name: `ZORO9X (${userEmail})`,
    issuer: 'ZORO9X'
  });
  
  return secret;
}

/**
 * Generate QR code for 2FA setup
 */
async function generateQRCode(otpauthUrl) {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
    return qrCodeDataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
}

/**
 * Generate backup codes
 */
function generateBackupCodes(count = 10) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    codes.push(code);
  }
  return codes;
}

/**
 * Enable 2FA for user
 */
async function enable2FA(userId, userType, secret, backupCodes) {
  try {
    const connection = await pool.getConnection();
    
    await connection.execute(
      `INSERT INTO two_factor_auth (user_id, user_type, secret, backup_codes, is_enabled, enabled_at) 
       VALUES (?, ?, ?, ?, true, NOW())
       ON DUPLICATE KEY UPDATE 
       secret = ?, backup_codes = ?, is_enabled = true, enabled_at = NOW()`,
      [userId, userType, secret, JSON.stringify(backupCodes), secret, JSON.stringify(backupCodes)]
    );
    
    connection.release();
    return true;
  } catch (error) {
    console.error('Error enabling 2FA:', error);
    throw error;
  }
}

/**
 * Disable 2FA for user
 */
async function disable2FA(userId, userType) {
  try {
    const connection = await pool.getConnection();
    
    await connection.execute(
      'UPDATE two_factor_auth SET is_enabled = false WHERE user_id = ? AND user_type = ?',
      [userId, userType]
    );
    
    connection.release();
    return true;
  } catch (error) {
    console.error('Error disabling 2FA:', error);
    throw error;
  }
}

/**
 * Verify 2FA token
 */
async function verifyToken(userId, userType, token) {
  try {
    const connection = await pool.getConnection();
    
    const [results] = await connection.execute(
      'SELECT secret, backup_codes FROM two_factor_auth WHERE user_id = ? AND user_type = ? AND is_enabled = true',
      [userId, userType]
    );
    
    if (results.length === 0) {
      connection.release();
      return { valid: false, message: '2FA not enabled' };
    }
    
    const { secret, backup_codes } = results[0];
    
    // Verify TOTP token
    const isValid = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 2
    });
    
    if (isValid) {
      // Update last used timestamp
      await connection.execute(
        'UPDATE two_factor_auth SET last_used_at = NOW() WHERE user_id = ? AND user_type = ?',
        [userId, userType]
      );
      
      connection.release();
      return { valid: true };
    }
    
    // Check if it's a backup code
    const codes = JSON.parse(backup_codes || '[]');
    const codeIndex = codes.indexOf(token.toUpperCase());
    
    if (codeIndex !== -1) {
      // Remove used backup code
      codes.splice(codeIndex, 1);
      
      await connection.execute(
        'UPDATE two_factor_auth SET backup_codes = ?, last_used_at = NOW() WHERE user_id = ? AND user_type = ?',
        [JSON.stringify(codes), userId, userType]
      );
      
      connection.release();
      return { valid: true, backupCodeUsed: true, remainingCodes: codes.length };
    }
    
    connection.release();
    return { valid: false, message: 'Invalid token' };
    
  } catch (error) {
    console.error('Error verifying token:', error);
    throw error;
  }
}

/**
 * Check if user has 2FA enabled
 */
async function is2FAEnabled(userId, userType) {
  try {
    const connection = await pool.getConnection();
    
    const [results] = await connection.execute(
      'SELECT is_enabled FROM two_factor_auth WHERE user_id = ? AND user_type = ?',
      [userId, userType]
    );
    
    connection.release();
    
    return results.length > 0 && results[0].is_enabled;
  } catch (error) {
    console.error('Error checking 2FA status:', error);
    return false;
  }
}

/**
 * Get backup codes
 */
async function getBackupCodes(userId, userType) {
  try {
    const connection = await pool.getConnection();
    
    const [results] = await connection.execute(
      'SELECT backup_codes FROM two_factor_auth WHERE user_id = ? AND user_type = ?',
      [userId, userType]
    );
    
    connection.release();
    
    if (results.length > 0) {
      return JSON.parse(results[0].backup_codes || '[]');
    }
    
    return [];
  } catch (error) {
    console.error('Error getting backup codes:', error);
    return [];
  }
}

/**
 * Regenerate backup codes
 */
async function regenerateBackupCodes(userId, userType) {
  try {
    const newCodes = generateBackupCodes();
    const connection = await pool.getConnection();
    
    await connection.execute(
      'UPDATE two_factor_auth SET backup_codes = ? WHERE user_id = ? AND user_type = ?',
      [JSON.stringify(newCodes), userId, userType]
    );
    
    connection.release();
    return newCodes;
  } catch (error) {
    console.error('Error regenerating backup codes:', error);
    throw error;
  }
}

module.exports = {
  generateSecret,
  generateQRCode,
  generateBackupCodes,
  enable2FA,
  disable2FA,
  verifyToken,
  is2FAEnabled,
  getBackupCodes,
  regenerateBackupCodes
};
