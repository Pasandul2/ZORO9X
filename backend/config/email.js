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

const escapeHtml = (value = '') => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

// LiteSpeed/WAF can reject large styled HTML templates. Convert to a safe body.
const toGatewaySafeHtml = (html = '') => {
  const withoutScripts = String(html)
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const clipped = withoutScripts.slice(0, 8000);
  const safeText = escapeHtml(clipped || 'Message content unavailable.');
  return `<p style="font-family: Arial, sans-serif; line-height: 1.5;">${safeText}</p>`;
};

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
    html: toGatewaySafeHtml(mailOptions.html),
    cc: mailOptions.cc || null,
    bcc: mailOptions.bcc || null
  };

  try {
    console.log(`📧 Sending via PHP gateway to: ${requestData.to}`);
    console.log(`🔗 URL: ${PHP_MAIL_SERVICE_URL}`);
    console.log(`📝 Gateway payload size: ${requestData.html.length} chars`);

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
