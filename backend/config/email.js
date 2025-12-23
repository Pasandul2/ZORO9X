/**
 * Email Configuration using Nodemailer
 * 
 * SMTP Configuration for Gmail
 * Uses environment variables for security
 */

const nodemailer = require('nodemailer');
require('dotenv').config();

// Create reusable transporter with Gmail SMTP
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true', // Use TLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD // App password
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Verify transporter configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email configuration error:', error);
  } else {
    console.log('✅ Email server is ready to send messages');
  }
});

module.exports = transporter;
