/**
 * Authentication Controller with Email Verification & Password Reset
 * 
 * Handles user registration with email verification, login, profile, and password reset
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const transporter = require('../config/email');
const { verificationEmailTemplate, passwordResetTemplate, welcomeEmailTemplate } = require('../utils/emailTemplates');

// ============================================
// HELPER: Generate 6-digit verification code
// ============================================
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// ============================================
// HELPER: Send verification email
// ============================================
const sendVerificationEmail = async (email, fullName, code) => {
  try {
    await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || 'Zoro9x'}" <${process.env.EMAIL_FROM_ADDRESS}>`,
      to: email,
      subject: 'Verify Your Email - Zoro9x',
      html: verificationEmailTemplate(fullName, code)
    });
    console.log('✅ Verification email sent to:', email);
    return true;
  } catch (error) {
    console.error('❌ Error sending verification email:', error);
    return false;
  }
};

// ============================================
// HELPER: Send password reset email
// ============================================
const sendPasswordResetEmail = async (email, fullName, code) => {
  try {
    await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || 'Zoro9x'}" <${process.env.EMAIL_FROM_ADDRESS}>`,
      to: email,
      subject: 'Reset Your Password - Zoro9x',
      html: passwordResetTemplate(fullName, code)
    });
    console.log('✅ Password reset email sent to:', email);
    return true;
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    return false;
  }
};

// ============================================
// HELPER: Send welcome email
// ============================================
const sendWelcomeEmail = async (email, fullName) => {
  try {
    await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || 'Zoro9x'}" <${process.env.EMAIL_FROM_ADDRESS}>`,
      to: email,
      subject: 'Welcome to Zoro9x! 🎉',
      html: welcomeEmailTemplate(fullName)
    });
    console.log('✅ Welcome email sent to:', email);
  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
  }
};

// ============================================
// REGISTER - Create new user account with email verification
// ============================================
const register = async (req, res) => {
  try {
    const { email, password, fullName, phone } = req.body;

    // INPUT VALIDATION
    if (!email || !password || !fullName) {
      return res.status(400).json({ 
        message: 'Email, password, and full name are required' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        message: 'Password must be at least 6 characters long' 
      });
    }

    const connection = await pool.getConnection();

    // CHECK IF USER EXISTS
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

    // HASH PASSWORD
    const hashedPassword = await bcrypt.hash(
      password, 
      parseInt(process.env.BCRYPT_ROUNDS || '10')
    );

    // GENERATE VERIFICATION CODE
    const verificationCode = generateVerificationCode();
    const codeExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // CREATE USER IN DATABASE
    const [result] = await connection.execute(
      'INSERT INTO users (email, password, fullName, phone, verification_code, verification_code_expires, is_verified) VALUES (?, ?, ?, ?, ?, ?, FALSE)',
      [email, hashedPassword, fullName, phone || null, verificationCode, codeExpiry]
    );

    const userId = result.insertId;

    connection.release();

    // SEND VERIFICATION EMAIL
    const emailSent = await sendVerificationEmail(email, fullName, verificationCode);

    if (!emailSent) {
      return res.status(500).json({ 
        message: 'User created but failed to send verification email. Please try resending.' 
      });
    }

    // SUCCESS RESPONSE
    res.status(201).json({
      message: 'Registration successful! Please check your email for verification code.',
      userId: userId,
      email: email,
      requiresVerification: true
    });
  } catch (error) {
    console.error('❌ Register error:', error.message);
    res.status(500).json({ 
      message: 'Internal server error' 
    });
  }
};

// ============================================
// VERIFY EMAIL - Verify user email with code
// ============================================
const verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ 
        message: 'Email and verification code are required' 
      });
    }

    const connection = await pool.getConnection();

    // FIND USER WITH VERIFICATION CODE
    const [users] = await connection.execute(
      'SELECT id, email, fullName, verification_code, verification_code_expires, is_verified FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      connection.release();
      return res.status(404).json({ 
        message: 'User not found' 
      });
    }

    const user = users[0];

    // CHECK IF ALREADY VERIFIED
    if (user.is_verified) {
      connection.release();
      return res.status(400).json({ 
        message: 'Email already verified' 
      });
    }

    // CHECK IF CODE MATCHES
    if (user.verification_code !== code) {
      connection.release();
      return res.status(400).json({ 
        message: 'Invalid verification code' 
      });
    }

    // CHECK IF CODE EXPIRED
    if (new Date() > new Date(user.verification_code_expires)) {
      connection.release();
      return res.status(400).json({ 
        message: 'Verification code has expired. Please request a new one.' 
      });
    }

    // UPDATE USER AS VERIFIED
    await connection.execute(
      'UPDATE users SET is_verified = TRUE, verification_code = NULL, verification_code_expires = NULL WHERE id = ?',
      [user.id]
    );

    // GENERATE JWT TOKEN
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'your_jwt_secret_key_change_this_in_production_12345678',
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    connection.release();

    // SEND WELCOME EMAIL
    sendWelcomeEmail(user.email, user.fullName);

    // SUCCESS RESPONSE
    res.json({
      message: 'Email verified successfully!',
      user: { id: user.id, email: user.email, fullName: user.fullName },
      token
    });
  } catch (error) {
    console.error('❌ Verify email error:', error.message);
    res.status(500).json({ 
      message: 'Internal server error' 
    });
  }
};

// ============================================
// RESEND VERIFICATION CODE
// ============================================
const resendVerificationCode = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        message: 'Email is required' 
      });
    }

    const connection = await pool.getConnection();

    // FIND USER
    const [users] = await connection.execute(
      'SELECT id, email, fullName, is_verified FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      connection.release();
      return res.status(404).json({ 
        message: 'User not found' 
      });
    }

    const user = users[0];

    // CHECK IF ALREADY VERIFIED
    if (user.is_verified) {
      connection.release();
      return res.status(400).json({ 
        message: 'Email already verified' 
      });
    }

    // GENERATE NEW VERIFICATION CODE
    const verificationCode = generateVerificationCode();
    const codeExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // UPDATE VERIFICATION CODE
    await connection.execute(
      'UPDATE users SET verification_code = ?, verification_code_expires = ? WHERE id = ?',
      [verificationCode, codeExpiry, user.id]
    );

    connection.release();

    // SEND NEW VERIFICATION EMAIL
    const emailSent = await sendVerificationEmail(user.email, user.fullName, verificationCode);

    if (!emailSent) {
      return res.status(500).json({ 
        message: 'Failed to send verification email' 
      });
    }

    res.json({
      message: 'Verification code sent successfully! Check your email.'
    });
  } catch (error) {
    console.error('❌ Resend verification error:', error.message);
    res.status(500).json({ 
      message: 'Internal server error' 
    });
  }
};

// ============================================
// LOGIN - Authenticate with email & password
// ============================================
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // INPUT VALIDATION
    if (!email || !password) {
      return res.status(400).json({ 
        message: 'Email and password are required' 
      });
    }

    const connection = await pool.getConnection();

    // FIND USER IN DATABASE
    const [users] = await connection.execute(
      'SELECT id, email, password, fullName, is_verified FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      connection.release();
      return res.status(401).json({ 
        message: 'Invalid email or password' 
      });
    }

    const user = users[0];

    // CHECK IF EMAIL IS VERIFIED
    if (!user.is_verified) {
      connection.release();
      return res.status(403).json({ 
        message: 'Please verify your email before logging in',
        requiresVerification: true
      });
    }

    // VERIFY PASSWORD
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      connection.release();
      return res.status(401).json({ 
        message: 'Invalid email or password' 
      });
    }

    // GENERATE JWT TOKEN
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'your_jwt_secret_key_change_this_in_production_12345678',
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    connection.release();

    // SUCCESS RESPONSE
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
// FORGOT PASSWORD - Request password reset
// ============================================
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        message: 'Email is required' 
      });
    }

    const connection = await pool.getConnection();

    // FIND USER
    const [users] = await connection.execute(
      'SELECT id, email, fullName FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      connection.release();
      // Don't reveal if email exists for security
      return res.json({ 
        message: 'If the email exists, a password reset code has been sent.' 
      });
    }

    const user = users[0];

    // GENERATE RESET CODE
    const resetCode = generateVerificationCode();
    const codeExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // SAVE RESET CODE
    await connection.execute(
      'UPDATE users SET reset_password_code = ?, reset_password_expires = ? WHERE id = ?',
      [resetCode, codeExpiry, user.id]
    );

    connection.release();

    // SEND PASSWORD RESET EMAIL
    await sendPasswordResetEmail(user.email, user.fullName, resetCode);

    res.json({
      message: 'If the email exists, a password reset code has been sent.'
    });
  } catch (error) {
    console.error('❌ Forgot password error:', error.message);
    res.status(500).json({ 
      message: 'Internal server error' 
    });
  }
};

// ============================================
// RESET PASSWORD - Reset password with code
// ============================================
const resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({ 
        message: 'Email, code, and new password are required' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        message: 'Password must be at least 6 characters long' 
      });
    }

    const connection = await pool.getConnection();

    // FIND USER WITH RESET CODE
    const [users] = await connection.execute(
      'SELECT id, email, reset_password_code, reset_password_expires FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      connection.release();
      return res.status(404).json({ 
        message: 'User not found' 
      });
    }

    const user = users[0];

    // CHECK IF CODE MATCHES
    if (user.reset_password_code !== code) {
      connection.release();
      return res.status(400).json({ 
        message: 'Invalid reset code' 
      });
    }

    // CHECK IF CODE EXPIRED
    if (new Date() > new Date(user.reset_password_expires)) {
      connection.release();
      return res.status(400).json({ 
        message: 'Reset code has expired. Please request a new one.' 
      });
    }

    // HASH NEW PASSWORD
    const hashedPassword = await bcrypt.hash(
      newPassword, 
      parseInt(process.env.BCRYPT_ROUNDS || '10')
    );

    // UPDATE PASSWORD AND CLEAR RESET CODE
    await connection.execute(
      'UPDATE users SET password = ?, reset_password_code = NULL, reset_password_expires = NULL WHERE id = ?',
      [hashedPassword, user.id]
    );

    connection.release();

    res.json({
      message: 'Password reset successfully! You can now login with your new password.'
    });
  } catch (error) {
    console.error('❌ Reset password error:', error.message);
    res.status(500).json({ 
      message: 'Internal server error' 
    });
  }
};

// ============================================
// GET PROFILE - Retrieve logged-in user data
// ============================================
const getProfile = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ 
        message: 'Unauthorized - No valid token' 
      });
    }

    const connection = await pool.getConnection();

    // FETCH USER FROM DATABASE
    const [users] = await connection.execute(
      'SELECT id, email, fullName, phone, is_verified, created_at FROM users WHERE id = ?',
      [userId]
    );

    connection.release();

    if (users.length === 0) {
      return res.status(404).json({ 
        message: 'User not found' 
      });
    }

    res.json({ user: users[0] });
  } catch (error) {
    console.error('❌ Get profile error:', error.message);
    res.status(500).json({ 
      message: 'Internal server error' 
    });
  }
};

module.exports = { 
  register, 
  verifyEmail,
  resendVerificationCode,
  login, 
  forgotPassword,
  resetPassword,
  getProfile 
};
