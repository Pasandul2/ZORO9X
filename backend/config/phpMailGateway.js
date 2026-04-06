/**
 * PHP Mail Gateway - Sends emails through a PHP service
 * 
 * This module sends emails by calling a PHP endpoint instead of direct SMTP
 * Useful when outgoing mail ports are blocked on the server
 */

const axios = require('axios');
require('dotenv').config();

const PHP_MAIL_SERVICE_URL = process.env.PHP_MAIL_SERVICE_URL || 'http://localhost/send-mail.php';

/**
 * Send email via PHP gateway
 * @param {Object} mailOptions - Email options
 * @param {string} mailOptions.to - Recipient email
 * @param {string} mailOptions.subject - Email subject
 * @param {string} mailOptions.html - HTML content
 * @param {string} [mailOptions.from] - From email
 * @returns {Promise}
 */
const sendEmailViaPhp = async (mailOptions) => {
  try {
    // Set default sender if not provided
    if (!mailOptions.from) {
      mailOptions.from = process.env.EMAIL_USER || 'noreply@zoro9x.com';
    }

    console.log(`📧 Sending email via PHP gateway to: ${mailOptions.to}`);

    const response = await axios.post(PHP_MAIL_SERVICE_URL, {
      to: mailOptions.to,
      from: mailOptions.from,
      subject: mailOptions.subject,
      html: mailOptions.html,
      cc: mailOptions.cc || null,
      bcc: mailOptions.bcc || null
    }, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.PHP_MAIL_API_KEY || 'your-secret-key'
      }
    });

    if (response.data.success) {
      console.log(`✅ Email sent successfully via PHP gateway`);
      return response.data;
    } else {
      throw new Error(response.data.message || 'PHP mail gateway error');
    }
  } catch (error) {
    console.error('❌ PHP Mail Gateway Error:', error.message);
    throw error;
  }
};

module.exports = { sendEmailViaPhp };
