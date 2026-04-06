/**
 * Email Configuration - Dual Method Support
 * 
 * 1. Direct SMTP (Gmail) - Primary method
 * 2. PHP Gateway Fallback - When SMTP ports are blocked
 * 
 * Set EMAIL_METHOD=php to use PHP gateway exclusively
 * Or set EMAIL_METHOD=auto for automatic fallback
 */

const nodemailer = require('nodemailer');
const axios = require('axios');
require('dotenv').config();

const EMAIL_METHOD = process.env.EMAIL_METHOD || 'auto'; // auto, smtp, or php
const PHP_MAIL_SERVICE_URL = process.env.PHP_MAIL_SERVICE_URL;
const PHP_MAIL_API_KEY = process.env.PHP_MAIL_API_KEY || 'your-secret-key';

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

// Verify transporter configuration (non-blocking)
if (EMAIL_METHOD !== 'php') {
  transporter.verify((error, success) => {
    if (error) {
      console.error('❌ SMTP configuration error:', error.message);
      if (EMAIL_METHOD === 'auto') {
        console.log('⚠️  Will fallback to PHP gateway for email sending');
      }
    } else {
      console.log('✅ SMTP server is ready to send messages');
    }
  });
}

/**
 * Send email via PHP gateway
 * @private
 */
const sendViaPhpGateway = async (mailOptions) => {
  if (!PHP_MAIL_SERVICE_URL) {
    throw new Error('PHP_MAIL_SERVICE_URL not configured in .env');
  }

  try {
    console.log(`📧 Sending via PHP gateway to: ${mailOptions.to}`);
    console.log(`🔗 URL: ${PHP_MAIL_SERVICE_URL}`);
    console.log(`🔐 API Key: ${PHP_MAIL_API_KEY}`);
    
    const requestData = {
      to: mailOptions.to,
      from: mailOptions.from || process.env.EMAIL_USER || 'noreply@zoro9x.com',
      subject: mailOptions.subject,
      html: mailOptions.html,
      cc: mailOptions.cc || null,
      bcc: mailOptions.bcc || null
    };

    const response = await axios.post(PHP_MAIL_SERVICE_URL, requestData, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': PHP_MAIL_API_KEY
      }
    });

    if (response.data.success) {
      console.log(`✅ Email sent via PHP gateway`);
      return {
        success: true,
        messageId: `php-${Date.now()}`,
        method: 'php'
      };
    } else {
      throw new Error(response.data.message || 'PHP gateway error');
    }
  } catch (error) {
    console.error('❌ PHP Gateway Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
};

/**
 * Send Email Function - Main Entry Point
 * 
 * @param {Object} mailOptions - Email options object
 * @param {string} mailOptions.to - Recipient email address
 * @param {string} mailOptions.subject - Email subject
 * @param {string} mailOptions.html - HTML email content
 * @param {string} [mailOptions.from] - Sender email (optional)
 * @returns {Promise} - Result of email sending
 */
const sendEmail = async (mailOptions) => {
  try {
    // Set default sender if not provided
    if (!mailOptions.from) {
      mailOptions.from = process.env.EMAIL_USER || 'noreply@zoro9x.com';
    }

    // Use PHP gateway exclusively if configured
    if (EMAIL_METHOD === 'php') {
      return await sendViaPhpGateway(mailOptions);
    }

    // Try SMTP first
    if (EMAIL_METHOD === 'auto' || EMAIL_METHOD === 'smtp') {
      try {
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent via SMTP:', info.messageId);
        return {
          success: true,
          messageId: info.messageId,
          method: 'smtp'
        };
      } catch (smtpError) {
        console.warn('⚠️  SMTP failed:', smtpError.message);
        
        // Fallback to PHP gateway if auto mode and PHP is configured
        if (EMAIL_METHOD === 'auto' && PHP_MAIL_SERVICE_URL) {
          console.log('🔄 Attempting fallback to PHP gateway...');
          return await sendViaPhpGateway(mailOptions);
        }
        
        throw smtpError;
      }
    }
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    throw error;
  }
};

module.exports = {
  transporter,
  sendEmail,
  sendViaPhpGateway
};
