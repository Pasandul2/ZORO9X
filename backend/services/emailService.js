/**
 * Email Service
 * 
 * Handles email sending with template support
 */

const nodemailer = require('nodemailer');
const { pool } = require('../config/database');

// Create email transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});

/**
 * Replace template variables with actual values
 */
function replaceVariables(template, variables) {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value);
  }
  return result;
}

/**
 * Send email using template
 */
async function sendEmail(templateName, recipientEmail, variables) {
  try {
    const connection = await pool.getConnection();
    
    // Get template
    const [templates] = await connection.execute(
      'SELECT * FROM email_templates WHERE name = ? AND is_active = true',
      [templateName]
    );
    
    if (templates.length === 0) {
      throw new Error(`Email template '${templateName}' not found`);
    }
    
    const template = templates[0];
    
    // Replace variables
    const subject = replaceVariables(template.subject, variables);
    const html = replaceVariables(template.body_html, variables);
    const text = replaceVariables(template.body_text || '', variables);
    
    // Send email
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"ZORO9X" <noreply@zoro9x.com>',
      to: recipientEmail,
      subject: subject,
      text: text,
      html: html
    });
    
    // Log email
    await connection.execute(
      `INSERT INTO email_logs (template_id, recipient_email, subject, status, sent_at) 
       VALUES (?, ?, ?, 'sent', NOW())`,
      [template.id, recipientEmail, subject]
    );
    
    connection.release();
    
    console.log('✅ Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
    
  } catch (error) {
    console.error('❌ Error sending email:', error);
    
    // Log failed email
    try {
      const connection = await pool.getConnection();
      await connection.execute(
        `INSERT INTO email_logs (recipient_email, subject, status, error_message) 
         VALUES (?, ?, 'failed', ?)`,
        [recipientEmail, templateName, error.message]
      );
      connection.release();
    } catch (logError) {
      console.error('Failed to log email error:', logError);
    }
    
    return { success: false, error: error.message };
  }
}

/**
 * Send welcome email
 */
async function sendWelcomeEmail(userEmail, fullName) {
  return sendEmail('welcome_email', userEmail, {
    fullName,
    email: userEmail
  });
}

/**
 * Send subscription created email
 */
async function sendSubscriptionEmail(userEmail, subscriptionData) {
  return sendEmail('subscription_created', userEmail, {
    fullName: subscriptionData.fullName,
    systemName: subscriptionData.systemName,
    planName: subscriptionData.planName,
    apiKey: subscriptionData.apiKey,
    price: subscriptionData.price,
    databaseName: subscriptionData.databaseName
  });
}

/**
 * Send payment receipt email
 */
async function sendPaymentReceiptEmail(userEmail, paymentData) {
  return sendEmail('payment_receipt', userEmail, {
    fullName: paymentData.fullName,
    amount: paymentData.amount,
    invoiceNumber: paymentData.invoiceNumber,
    date: new Date().toLocaleDateString()
  });
}

/**
 * Send subscription expiring email
 */
async function sendSubscriptionExpiringEmail(userEmail, subscriptionData) {
  return sendEmail('subscription_expiring', userEmail, {
    fullName: subscriptionData.fullName,
    systemName: subscriptionData.systemName,
    daysLeft: subscriptionData.daysLeft,
    renewUrl: `${process.env.FRONTEND_URL}/client-dashboard`
  });
}

/**
 * Send trial ending email
 */
async function sendTrialEndingEmail(userEmail, trialData) {
  return sendEmail('trial_ending', userEmail, {
    fullName: trialData.fullName,
    systemName: trialData.systemName,
    daysLeft: trialData.daysLeft,
    upgradeUrl: `${process.env.FRONTEND_URL}/marketplace`
  });
}

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendSubscriptionEmail,
  sendPaymentReceiptEmail,
  sendSubscriptionExpiringEmail,
  sendTrialEndingEmail
};
