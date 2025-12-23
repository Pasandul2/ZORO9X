/**
 * Authentication Middleware
 * 
 * Verifies JWT token in request headers
 * Protects routes that require authentication
 */

const jwt = require('jsonwebtoken');

// ============================================
// VERIFY JWT TOKEN MIDDLEWARE
// ============================================
/**
 * Middleware to verify JWT token from Authorization header
 * 
 * Header format: Authorization: Bearer <token>
 * 
 * Adds user data to request object if valid
 * Returns 401/403 error if invalid
 */
const verifyToken = (req, res, next) => {
  // ============================================
  // EXTRACT TOKEN FROM HEADER
  // ============================================
  // Expected format: "Bearer <token>"
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      message: 'No token provided' 
    });
  }

  // ============================================
  // VERIFY TOKEN WITH JWT SECRET
  // ============================================
  try {
    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'your_jwt_secret_key_change_this_in_production_12345678'
    );
    
    // Add user data to request object
    req.user = decoded;
    
    // Continue to next middleware/route handler
    next();
  } catch (error) {
    res.status(403).json({ 
      message: 'Invalid or expired token' 
    });
  }
};

// ============================================
// VERIFY ADMIN TOKEN MIDDLEWARE
// ============================================
/**
 * Middleware to verify admin JWT token
 * Similar to verifyToken but for admin routes
 */
const verifyAdminToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      message: 'No admin token provided' 
    });
  }

  try {
    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'your_jwt_secret_key_change_this_in_production_12345678'
    );
    
    // Add admin data to request object
    req.admin = decoded;
    
    next();
  } catch (error) {
    res.status(403).json({ 
      message: 'Invalid or expired admin token' 
    });
  }
};

module.exports = { verifyToken, verifyAdminToken };

