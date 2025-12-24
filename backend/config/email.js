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

/**
 * Send Email Function
 * Sends email using the configured transporter
 * 
 * @param {Object} mailOptions - Email options object
 * @param {string} mailOptions.to - Recipient email address
 * @param {string} mailOptions.subject - Email subject
 * @param {string} mailOptions.html - HTML email content
 * @param {string} [mailOptions.from] - Sender email (optional, uses default)
 * @returns {Promise} - Result of email sending
 */
const sendEmail = async (mailOptions) => {
  try {
    // Set default sender if not provided
    if (!mailOptions.from) {
      mailOptions.from = process.env.EMAIL_USER || 'noreply@zoro9x.com';
    }

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info.messageId);
    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    console.error('❌ Error sending email:', error);
    throw error;
  }
};

module.exports = {
  transporter,
  sendEmail
};
