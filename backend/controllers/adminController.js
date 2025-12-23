/**
 * Admin Authentication Controller
 * Handles admin login and profile operations
 * Separate from regular user authentication
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

/**
 * Admin Login
 * Authenticates admin users with email and password
 * 
 * @route POST /api/admin/login
 * @access Public
 */
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        message: 'Email and password are required' 
      });
    }

    // Check if admin exists
    const [admins] = await pool.query(
      'SELECT * FROM admins WHERE email = ?',
      [email]
    );

    if (admins.length === 0) {
      return res.status(401).json({ 
        message: 'Invalid admin credentials' 
      });
    }

    const admin = admins[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, admin.password);

    if (!isPasswordValid) {
      return res.status(401).json({ 
        message: 'Invalid admin credentials' 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: admin.id, 
        email: admin.email,
        role: admin.role,
        isAdmin: true
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    // Return success response (exclude password)
    res.status(200).json({
      message: 'Admin login successful',
      admin: {
        id: admin.id,
        email: admin.email,
        fullName: admin.fullName,
        role: admin.role
      },
      token
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ 
      message: 'Server error during admin login' 
    });
  }
};

/**
 * Get Admin Profile
 * Returns authenticated admin's profile information
 * 
 * @route GET /api/admin/profile
 * @access Private (Admin only)
 */
const getAdminProfile = async (req, res) => {
  try {
    const adminId = req.user.id;

    // Fetch admin details from database
    const [admins] = await pool.query(
      'SELECT id, email, fullName, role, created_at FROM admins WHERE id = ?',
      [adminId]
    );

    if (admins.length === 0) {
      return res.status(404).json({ 
        message: 'Admin not found' 
      });
    }

    res.status(200).json({ 
      admin: admins[0] 
    });

  } catch (error) {
    console.error('Get admin profile error:', error);
    res.status(500).json({ 
      message: 'Server error fetching admin profile' 
    });
  }
};

/**
 * Get All Users
 * Returns all registered users for admin management
 * 
 * @route GET /api/admin/users
 * @access Private (Admin only)
 */
const getAllUsers = async (req, res) => {
  try {
    // Fetch all users from database (exclude passwords)
    const [users] = await pool.query(
      'SELECT id, email, fullName, isVerified, created_at, lastLogin FROM users ORDER BY created_at DESC'
    );

    res.status(200).json({ 
      users,
      count: users.length
    });

  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ 
      message: 'Server error fetching users' 
    });
  }
};

module.exports = {
  adminLogin,
  getAdminProfile,
  getAllUsers
};
