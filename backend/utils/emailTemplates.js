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
      font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #ffffff;
      background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%);
      padding: 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: linear-gradient(180deg, #0f0f0f 0%, #1a1a1a 100%);
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 1px rgba(236, 72, 153, 0.3);
      border: 1px solid rgba(59, 130, 246, 0.1);
    }
    .header {
      background: #000000;
      padding: 40px 30px;
      text-align: center;
      border-bottom: 2px solid transparent;
      border-image: linear-gradient(90deg, #ec4899 0%, #3b82f6 100%);
      border-image-slice: 1;
      position: relative;
    }
    .header::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: linear-gradient(90deg, #ec4899 0%, #3b82f6 100%);
      opacity: 0.5;
    }
    .logo {
      max-width: 180px;
      height: auto;
      filter: drop-shadow(0 4px 8px rgba(236, 72, 153, 0.3));
    }
    .content {
      padding: 50px 40px;
      background: linear-gradient(180deg, rgba(26, 26, 26, 0.8) 0%, rgba(15, 15, 15, 0.9) 100%);
    }
    .title {
      color: #ffffff;
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 24px;
      letter-spacing: -0.5px;
      background: linear-gradient(135deg, #ec4899 0%, #3b82f6 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .text {
      color: #b0b0b0;
      font-size: 16px;
      margin-bottom: 16px;
      line-height: 1.8;
    }
    .code-box {
      background: linear-gradient(135deg, rgba(236, 72, 153, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%);
      color: #ffffff;
      font-size: 36px;
      font-weight: 800;
      letter-spacing: 8px;
      padding: 30px;
      text-align: center;
      border-radius: 12px;
      margin: 35px 0;
      border: 2px solid;
      border-image: linear-gradient(135deg, #ec4899 0%, #3b82f6 100%);
      border-image-slice: 1;
      box-shadow: 0 8px 32px rgba(236, 72, 153, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1);
      position: relative;
    }
    .code-box::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: 12px;
      padding: 2px;
      background: linear-gradient(135deg, #ec4899 0%, #3b82f6 100%);
      -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #ec4899 0%, #3b82f6 100%);
      color: #ffffff;
      text-decoration: none;
      padding: 16px 48px;
      border-radius: 10px;
      font-weight: 700;
      margin: 25px 0;
      box-shadow: 0 4px 20px rgba(236, 72, 153, 0.4);
      transition: transform 0.2s ease;
    }
    .footer {
      background: #000000;
      padding: 35px 30px;
      text-align: center;
      border-top: 1px solid rgba(59, 130, 246, 0.2);
    }
    .footer-text {
      color: #666;
      font-size: 13px;
      margin: 8px 0;
      letter-spacing: 0.3px;
    }
    .divider {
      height: 1px;
      background: linear-gradient(90deg, transparent 0%, rgba(236, 72, 153, 0.3) 50%, transparent 100%);
      margin: 25px 0;
    }
    strong {
      color: #ec4899;
      font-weight: 700;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="cid:logo" alt="Zoro9x Logo" class="logo">
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
