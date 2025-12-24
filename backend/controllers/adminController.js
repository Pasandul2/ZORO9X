/**
 * Admin Authentication Controller
 * Handles admin login and profile operations
 * Separate from regular user authentication
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { sendEmail } = require('../config/email');
const { adminInvitationTemplate } = require('../utils/emailTemplates');

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

/**
 * Get All Admins
 * Returns all admin users with their roles and permissions
 * 
 * @route GET /api/admin/admins
 * @access Private (Super Admin only)
 */
const getAllAdmins = async (req, res) => {
  try {
    // Check if user is super_admin
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ 
        message: 'Only super admins can manage admins' 
      });
    }

    // Use a safer query that handles missing columns gracefully
    const [admins] = await pool.query(
      'SELECT id, email, fullName, role, COALESCE(permissions, NULL) as permissions, COALESCE(status, "active") as status, created_at, updated_at FROM admins ORDER BY created_at DESC'
    );

    res.status(200).json({ 
      success: true,
      admins,
      count: admins.length
    });

  } catch (error) {
    console.error('Get all admins error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error fetching admins' 
    });
  }
};

/**
 * Create New Admin
 * Creates a new admin user with specified role and permissions
 * 
 * @route POST /api/admin/admins
 * @access Private (Super Admin only)
 */
const createAdmin = async (req, res) => {
  try {
    // Check if user is super_admin
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ 
        message: 'Only super admins can create admins' 
      });
    }

    const { email, password, fullName, role, permissions } = req.body;

    // Validate input
    if (!email || !password || !fullName) {
      return res.status(400).json({ 
        message: 'Email, password, and fullName are required' 
      });
    }

    // Check if admin already exists
    const [existingAdmin] = await pool.query(
      'SELECT id FROM admins WHERE email = ?',
      [email]
    );

    if (existingAdmin.length > 0) {
      return res.status(400).json({ 
        message: 'Admin with this email already exists' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Default permissions if not provided
    const defaultPermissions = {
      dashboard: true,
      users: role === 'super_admin' ? true : false,
      portfolio: true,
      saas: role === 'super_admin' ? true : false,
      analytics: role === 'super_admin' ? true : false,
      database: role === 'super_admin' ? true : false,
      reports: role === 'super_admin' ? true : false,
      settings: role === 'super_admin' ? true : false,
      adminManagement: role === 'super_admin' ? true : false
    };

    const finalPermissions = permissions || defaultPermissions;

    // Try to create admin with all fields, fall back if columns don't exist
    let result;
    try {
      const [insertResult] = await pool.query(
        'INSERT INTO admins (email, password, fullName, role, permissions, status) VALUES (?, ?, ?, ?, ?, ?)',
        [email, hashedPassword, fullName, role || 'admin', JSON.stringify(finalPermissions), 'active']
      );
      result = insertResult;
    } catch (innerError) {
      // If permissions/status columns don't exist yet, insert without them
      if (innerError.code === 'ER_BAD_FIELD_ERROR') {
        const [insertResult] = await pool.query(
          'INSERT INTO admins (email, password, fullName, role) VALUES (?, ?, ?, ?)',
          [email, hashedPassword, fullName, role || 'admin']
        );
        result = insertResult;
      } else {
        throw innerError;
      }
    }

    // Send invitation email with credentials
    try {
      const adminPortalUrl = `${process.env.FRONTEND_URL}/admin/login`;
      const emailTemplate = adminInvitationTemplate(fullName, email, password, adminPortalUrl);
      
      await sendEmail({
        to: email,
        subject: '🎉 Welcome to Zoro9x Admin Portal - Your Account is Ready!',
        html: emailTemplate
      });

      console.log(`✅ Admin invitation email sent to ${email}`);
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      // Don't fail the admin creation if email fails, but log it
    }

    res.status(201).json({
      success: true,
      message: 'Admin created successfully and invitation email sent',
      admin: {
        id: result.insertId,
        email,
        fullName,
        role: role || 'admin',
        permissions: finalPermissions,
        createdAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error creating admin' 
    });
  }
};

/**
 * Update Admin
 * Updates admin details and permissions
 * 
 * @route PUT /api/admin/admins/:id
 * @access Private (Super Admin only)
 */
const updateAdmin = async (req, res) => {
  try {
    // Check if user is super_admin
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ 
        message: 'Only super admins can update admins' 
      });
    }

    const adminId = req.params.id;
    const { fullName, role, permissions, status } = req.body;

    // Check if admin exists
    const [admins] = await pool.query(
      'SELECT id FROM admins WHERE id = ?',
      [adminId]
    );

    if (admins.length === 0) {
      return res.status(404).json({ 
        message: 'Admin not found' 
      });
    }

    // Update admin
    const updateQuery = 'UPDATE admins SET fullName = ?, role = ?, permissions = ?, status = ? WHERE id = ?';
    await pool.query(
      updateQuery,
      [fullName, role, JSON.stringify(permissions), status, adminId]
    );

    res.status(200).json({
      success: true,
      message: 'Admin updated successfully'
    });

  } catch (error) {
    console.error('Update admin error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error updating admin' 
    });
  }
};

/**
 * Delete Admin
 * Removes an admin user from the system
 * 
 * @route DELETE /api/admin/admins/:id
 * @access Private (Super Admin only)
 */
const deleteAdmin = async (req, res) => {
  try {
    // Check if user is super_admin
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ 
        message: 'Only super admins can delete admins' 
      });
    }

    const adminId = req.params.id;

    // Don't allow deleting the super admin
    const [admin] = await pool.query(
      'SELECT role FROM admins WHERE id = ?',
      [adminId]
    );

    if (admin.length === 0) {
      return res.status(404).json({ 
        message: 'Admin not found' 
      });
    }

    if (admin[0].role === 'super_admin') {
      return res.status(400).json({ 
        message: 'Cannot delete super admin' 
      });
    }

    // Delete admin
    await pool.query(
      'DELETE FROM admins WHERE id = ?',
      [adminId]
    );

    res.status(200).json({
      success: true,
      message: 'Admin deleted successfully'
    });

  } catch (error) {
    console.error('Delete admin error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error deleting admin' 
    });
  }
};

/**
 * Resend Admin Invitation
 * Sends invitation email to existing admin
 * 
 * @route POST /api/admin/admins/:id/resend-invitation
 * @access Private (Super Admin only)
 */
const resendAdminInvitation = async (req, res) => {
  try {
    // Check if user is super_admin
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ 
        message: 'Only super admins can resend invitations' 
      });
    }

    const adminId = req.params.id;
    const { password } = req.body; // Optional: new password if provided

    // Fetch admin
    const [admins] = await pool.query(
      'SELECT email, fullName FROM admins WHERE id = ?',
      [adminId]
    );

    if (admins.length === 0) {
      return res.status(404).json({ 
        message: 'Admin not found' 
      });
    }

    const admin = admins[0];
    let passwordToSend = password;

    // If new password provided, hash and update it
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await pool.query(
        'UPDATE admins SET password = ? WHERE id = ?',
        [hashedPassword, adminId]
      );
    } else {
      // If no new password, generate a temporary one
      passwordToSend = 'TempPass' + Date.now();
      const hashedPassword = await bcrypt.hash(passwordToSend, 10);
      await pool.query(
        'UPDATE admins SET password = ? WHERE id = ?',
        [hashedPassword, adminId]
      );
    }

    // Send invitation email
    try {
      const adminPortalUrl = `${process.env.FRONTEND_URL}/admin/login`;
      const emailTemplate = adminInvitationTemplate(admin.fullName, admin.email, passwordToSend, adminPortalUrl);
      
      await sendEmail({
        to: admin.email,
        subject: '🎉 Zoro9x Admin Portal - Invitation Email',
        html: emailTemplate
      });

      console.log(`✅ Invitation email resent to ${admin.email}`);

      res.status(200).json({
        success: true,
        message: 'Invitation email sent successfully'
      });
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      res.status(500).json({ 
        success: false,
        message: 'Failed to send email: ' + emailError.message 
      });
    }

  } catch (error) {
    console.error('Resend invitation error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error resending invitation' 
    });
  }
};

module.exports = {
  adminLogin,
  getAdminProfile,
  getAllUsers,
  getAllAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  resendAdminInvitation
};
