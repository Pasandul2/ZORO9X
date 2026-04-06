/**
 * Email Configuration - PHP Gateway Only
 *
 * The VPS backend sends mail requests to the working PHP endpoint on
 * kgrexport.com. This keeps one stable path and avoids SMTP timeouts.
 */

const axios = require('axios');
require('dotenv').config();

const PHP_MAIL_SERVICE_URL = process.env.PHP_MAIL_SERVICE_URL;
const PHP_MAIL_API_KEY = process.env.PHP_MAIL_API_KEY || 'your-secret-key';

/**
 * Send email through the PHP gateway.
 *
 * @param {Object} mailOptions
 * @param {string} mailOptions.to
 * @param {string} mailOptions.subject
 * @param {string} mailOptions.html
 * @param {string} [mailOptions.from]
 * @param {string} [mailOptions.cc]
 * @param {string} [mailOptions.bcc]
 * @returns {Promise<{success: boolean, messageId: string, method: string}>}
 */
const sendEmail = async (mailOptions) => {
  if (!PHP_MAIL_SERVICE_URL) {
    throw new Error('PHP_MAIL_SERVICE_URL not configured in .env');
  }

  const requestData = {
    to: mailOptions.to,
    from: mailOptions.from || process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER || 'noreply@zoro9x.com',
    subject: mailOptions.subject,
    html: mailOptions.html,
    cc: mailOptions.cc || null,
    bcc: mailOptions.bcc || null
  };

  try {
    console.log(`📧 Sending via PHP gateway to: ${requestData.to}`);
    console.log(`🔗 URL: ${PHP_MAIL_SERVICE_URL}`);

    const response = await axios.post(PHP_MAIL_SERVICE_URL, requestData, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': PHP_MAIL_API_KEY
      }
    });

    if (!response.data || response.data.success !== true) {
      throw new Error(response.data?.message || 'PHP gateway error');
    }

    console.log(`✅ Email sent via PHP gateway to: ${requestData.to}`);
    return {
      success: true,
      messageId: `php-${Date.now()}`,
      method: 'php'
    };
  } catch (error) {
    console.error('❌ PHP Gateway Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
};

module.exports = {
  sendEmail
};
