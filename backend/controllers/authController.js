/**
 * Authentication Controller
 * 
 * Handles user registration, login, and profile retrieval
 * All passwords are hashed using bcryptjs for security
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

// ============================================
// REGISTER - Create new user account
// ============================================
/**
 * Register a new user
 * 
 * Body parameters:
 * - email (required): User email address
 * - password (required): User password (min 6 chars)
 * - fullName (required): User's full name
 * - phone (optional): User's phone number
 * 
 * Returns: JWT token and user data
 */
const register = async (req, res) => {
  try {
    const { email, password, fullName, phone } = req.body;

    // ============================================
    // INPUT VALIDATION
    // ============================================
    if (!email || !password || !fullName) {
      return res.status(400).json({ 
        message: 'Email, password, and full name are required' 
      });
    }

    // Get database connection from pool
    const connection = await pool.getConnection();

    // ============================================
    // CHECK IF USER EXISTS
    // ============================================
    const [existingUser] = await connection.execute(
      'SELECT email FROM users WHERE email = ?',
      [email]
    );

    if (existingUser.length > 0) {
      connection.release();
      return res.status(400).json({ 
        message: 'Email already registered' 
      });
    }

    // ============================================
    // HASH PASSWORD
    // ============================================
    // Use bcryptjs to securely hash password
    const hashedPassword = await bcrypt.hash(
      password, 
      parseInt(process.env.BCRYPT_ROUNDS || '10')
    );

    // ============================================
    // CREATE USER IN DATABASE
    // ============================================
    const [result] = await connection.execute(
      'INSERT INTO users (email, password, fullName, phone) VALUES (?, ?, ?, ?)',
      [email, hashedPassword, fullName, phone || null]
    );

    const userId = result.insertId;

    // ============================================
    // GENERATE JWT TOKEN
    // ============================================
    // Create token valid for 7 days
    const token = jwt.sign(
      { id: userId, email },
      process.env.JWT_SECRET || 'your_jwt_secret_key_change_this_in_production_12345678',
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    connection.release();

    // ============================================
    // SUCCESS RESPONSE
    // ============================================
    res.status(201).json({
      message: 'User registered successfully',
      user: { id: userId, email, fullName },
      token,
    });
  } catch (error) {
    console.error('❌ Register error:', error.message);
    res.status(500).json({ 
      message: 'Internal server error' 
    });
  }
};

// ============================================
// LOGIN - Authenticate with email & password
// ============================================
/**
 * Authenticate user and return JWT token
 * 
 * Body parameters:
 * - email (required): User email address
 * - password (required): User password
 * 
 * @returns {Object} JWT token and user data
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // ============================================
    // INPUT VALIDATION
    // ============================================
    if (!email || !password) {
      return res.status(400).json({ 
        message: 'Email and password are required' 
      });
    }

    const connection = await pool.getConnection();

    // ============================================
    // FIND USER IN DATABASE
    // ============================================
    const [users] = await connection.execute(
      'SELECT id, email, password, fullName FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      connection.release();
      return res.status(401).json({ 
        message: 'Invalid email or password' 
      });
    }

    const user = users[0];

    // ============================================
    // VERIFY PASSWORD AGAINST HASH
    // ============================================
    // Compare provided password with stored bcrypt hash
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      connection.release();
      return res.status(401).json({ 
        message: 'Invalid email or password' 
      });
    }

    // ============================================
    // GENERATE JWT TOKEN
    // ============================================
    // Create JWT token valid for 7 days
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'your_jwt_secret_key_change_this_in_production_12345678',
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    connection.release();

    // ============================================
    // RETURN SUCCESS RESPONSE
    // ============================================
    res.json({
      message: 'Login successful',
      user: { id: user.id, email: user.email, fullName: user.fullName },
      token,
    });
  } catch (error) {
    console.error('❌ Login error:', error.message);
    res.status(500).json({ 
      message: 'Internal server error' 
    });
  }
};

// ============================================
// GET PROFILE - Retrieve logged-in user data
// ============================================
/**
 * Get current user profile (Protected Route)
 * Requires valid JWT token in Authorization header
 * 
 * Headers:
 * - Authorization: Bearer <jwt_token>
 * 
 * @returns {Object} User profile data
 */
const getProfile = async (req, res) => {
  try {
    const userId = req.user?.id;

    // ============================================
    // VERIFY USER AUTHENTICATION
    // ============================================
    if (!userId) {
      return res.status(401).json({ 
        message: 'Unauthorized - No valid token' 
      });
    }

    const connection = await pool.getConnection();

    // ============================================
    // FETCH USER FROM DATABASE
    // ============================================
    const [users] = await connection.execute(
      'SELECT id, email, fullName, phone, created_at FROM users WHERE id = ?',
      [userId]
    );

    connection.release();

    if (users.length === 0) {
      return res.status(404).json({ 
        message: 'User not found' 
      });
    }

    // ============================================
    // RETURN USER PROFILE
    // ============================================
    res.json({ user: users[0] });
  } catch (error) {
    console.error('❌ Get profile error:', error.message);
    res.status(500).json({ 
      message: 'Internal server error' 
    });
  }
};

module.exports = { register, login, getProfile };
