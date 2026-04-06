/**
 * Email Configuration - PHP Gateway Only
 *
 * The VPS backend sends mail requests to the working PHP endpoint on
 * kgrexport.com. This keeps one stable path and avoids SMTP timeouts.
 */

const { execFile } = require('child_process');
const { promisify } = require('util');
require('dotenv').config();

const execFileAsync = promisify(execFile);
const PHP_MAIL_SERVICE_URL = process.env.PHP_MAIL_SERVICE_URL;
const PHP_MAIL_API_KEY = process.env.PHP_MAIL_API_KEY || 'your-secret-key';

const toBase64 = (value = '') => Buffer.from(String(value), 'utf8').toString('base64');

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
    // Keep a small fallback body, and send the full designed template as base64.
    html: '<p>Please view this message in an HTML capable email client.</p>',
    html_b64: toBase64(mailOptions.html || ''),
    html_encoding: 'base64',
    cc: mailOptions.cc || null,
    bcc: mailOptions.bcc || null
  };

  try {
    console.log(`📧 Sending via PHP gateway to: ${requestData.to}`);
    console.log(`🔗 URL: ${PHP_MAIL_SERVICE_URL}`);
    console.log(`📝 Gateway payload size: ${requestData.html_b64.length} chars (base64)`);

    const curlArgs = [
      '-sS',
      '-X', 'POST',
      PHP_MAIL_SERVICE_URL,
      '-H', 'Content-Type: application/json',
      '-H', `X-API-Key: ${PHP_MAIL_API_KEY}`,
      '--data-raw', JSON.stringify(requestData)
    ];

    const { stdout, stderr } = await execFileAsync('curl', curlArgs, {
      timeout: 10000,
      maxBuffer: 1024 * 1024
    });

    if (stderr) {
      const trimmedStderr = stderr.trim();
      if (trimmedStderr) {
        console.log(`curl stderr: ${trimmedStderr}`);
      }
    }

    let responseData;
    try {
      responseData = JSON.parse((stdout || '').trim() || '{}');
    } catch (parseError) {
      throw new Error(`Invalid gateway response: ${(stdout || '').trim() || 'empty response'}`);
    }

    if (!responseData || responseData.success !== true) {
      throw new Error(responseData?.message || 'PHP gateway error');
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
