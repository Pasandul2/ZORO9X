/**
 * Email Templates with Zoro9x Branding
 * 
 * Professional email templates for verification and password reset
 */

// Base email template with logo and styling
const baseTemplate = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Zoro9x</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f4f4f4;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%);
      padding: 30px;
      text-align: center;
    }
    .logo {
      max-width: 150px;
      height: auto;
    }
    .content {
      padding: 40px 30px;
    }
    .title {
      color: #1a1a1a;
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 20px;
    }
    .text {
      color: #555;
      font-size: 16px;
      margin-bottom: 15px;
    }
    .code-box {
      background: linear-gradient(135deg, #ec4899 0%, #3b82f6 100%);
      color: #ffffff;
      font-size: 32px;
      font-weight: bold;
      letter-spacing: 5px;
      padding: 20px;
      text-align: center;
      border-radius: 8px;
      margin: 30px 0;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #ec4899 0%, #3b82f6 100%);
      color: #ffffff;
      text-decoration: none;
      padding: 15px 40px;
      border-radius: 8px;
      font-weight: bold;
      margin: 20px 0;
    }
    .footer {
      background-color: #f8f8f8;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #eee;
    }
    .footer-text {
      color: #888;
      font-size: 14px;
    }
    .divider {
      height: 1px;
      background-color: #eee;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://i.ibb.co/ZfYqF5K/zoro.png" alt="Zoro9x Logo" class="logo">
    </div>
    ${content}
    <div class="footer">
      <p class="footer-text">© 2025 Zoro9x. All rights reserved.</p>
      <p class="footer-text">If you didn't request this email, please ignore it.</p>
    </div>
  </div>
</body>
</html>
`;

// Email Verification Template
const verificationEmailTemplate = (userName, verificationCode) => {
  const content = `
    <div class="content">
      <h1 class="title">Welcome to Zoro9x! 🎉</h1>
      <p class="text">Hi ${userName},</p>
      <p class="text">Thank you for registering with Zoro9x! To complete your registration and verify your email address, please use the verification code below:</p>
      
      <div class="code-box">
        ${verificationCode}
      </div>
      
      <p class="text">This code will expire in <strong>15 minutes</strong>.</p>
      
      <div class="divider"></div>
      
      <p class="text">If you didn't create an account with Zoro9x, you can safely ignore this email.</p>
      <p class="text">Best regards,<br><strong>The Zoro9x Team</strong></p>
    </div>
  `;
  return baseTemplate(content);
};

// Password Reset Template
const passwordResetTemplate = (userName, resetCode) => {
  const content = `
    <div class="content">
      <h1 class="title">Reset Your Password 🔐</h1>
      <p class="text">Hi ${userName},</p>
      <p class="text">We received a request to reset your password for your Zoro9x account. Use the code below to reset your password:</p>
      
      <div class="code-box">
        ${resetCode}
      </div>
      
      <p class="text">This code will expire in <strong>15 minutes</strong>.</p>
      
      <div class="divider"></div>
      
      <p class="text"><strong>Security Tip:</strong> If you didn't request a password reset, please ignore this email. Your account remains secure.</p>
      <p class="text">Best regards,<br><strong>The Zoro9x Team</strong></p>
    </div>
  `;
  return baseTemplate(content);
};

// Welcome Email Template (after successful verification)
const welcomeEmailTemplate = (userName) => {
  const content = `
    <div class="content">
      <h1 class="title">Welcome to Zoro9x! ✨</h1>
      <p class="text">Hi ${userName},</p>
      <p class="text">Congratulations! Your email has been successfully verified and your account is now active.</p>
      
      <p class="text">You can now enjoy all the features and services that Zoro9x has to offer. We're excited to have you on board!</p>
      
      <div class="divider"></div>
      
      <p class="text">If you have any questions or need assistance, feel free to reach out to our support team.</p>
      <p class="text">Best regards,<br><strong>The Zoro9x Team</strong></p>
    </div>
  `;
  return baseTemplate(content);
};

module.exports = {
  verificationEmailTemplate,
  passwordResetTemplate,
  welcomeEmailTemplate
};
