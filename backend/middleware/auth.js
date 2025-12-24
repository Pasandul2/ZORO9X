/**
 * Authentication Middleware
 * 
 * Verifies JWT token in request headers
 * Protects routes that require authentication
 */

const jwt = require('jsonwebtoken');

// ============================================
// VERIFY JWT TOKEN MIDDLEWARE (User)
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

// Alias for verifyToken (used in some routes)
const authenticateToken = verifyToken;

// ============================================
// ADMIN AUTHENTICATION MIDDLEWARE
// ============================================
/**
 * Middleware to verify admin role
 * Must be used after verifyToken middleware
 */
const authenticateAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  // Check if user has admin or super_admin role
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  
  next();
};

/**
 * Combined middleware: verify token AND admin role
 * Can be used as a single middleware in routes
 */
const verifyAdminToken = (req, res, next) => {
  verifyToken(req, res, (err) => {
    if (err) return;
    authenticateAdmin(req, res, next);
  });
};

module.exports = {
  verifyToken,
  authenticateToken,
  authenticateAdmin,
  verifyAdminToken
};

