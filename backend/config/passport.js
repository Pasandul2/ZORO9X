/**
 * Passport Google OAuth Configuration
 * 
 * Sets up Google OAuth 2.0 strategy for authentication
 * Handles user creation/lookup in database
 */

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt = require('bcryptjs');
const { pool } = require('./database');
const { transporter, sendEmail } = require('./email');
const { welcomeEmailTemplate } = require('../utils/emailTemplates');

// ============================================
// GOOGLE OAUTH STRATEGY
// ============================================
/**
 * Configure Google OAuth authentication
 * Verifies user with Google credentials
 * Creates or retrieves user from database
 */
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const connection = await pool.getConnection();

        // ============================================
        // CHECK IF USER EXISTS
        // ============================================
        const [existingUser] = await connection.execute(
          'SELECT id, email, fullName, is_verified FROM users WHERE email = ?',
          [profile.emails[0].value]
        );

        let user;

        if (existingUser.length > 0) {
          // ============================================
          // USER EXISTS - USE EXISTING
          // ============================================
          user = existingUser[0];
          
          // Ensure Google OAuth users are verified
          if (!user.is_verified) {
            await connection.execute(
              'UPDATE users SET is_verified = ? WHERE id = ?',
              [true, user.id]
            );
            user.is_verified = true;
          }
        } else {
          // ============================================
          // NEW USER - CREATE ACCOUNT
          // ============================================
          const email = profile.emails[0].value;
          const fullName = profile.displayName;
          const googleId = profile.id;

          // Generate random password for Google OAuth users
          // (They don't use password-based login)
          const randomPassword = await bcrypt.hash(googleId + Date.now(), 10);

          // Insert new user into database (Google OAuth users are auto-verified)
          const [result] = await connection.execute(
            'INSERT INTO users (email, password, fullName, is_verified) VALUES (?, ?, ?, ?)',
            [email, randomPassword, fullName, true]
          );

          user = {
            id: result.insertId,
            email: email,
            fullName: fullName,
          };

          console.log(`✅ New user created via Google OAuth: ${email}`);
          
          // ============================================
          // SEND WELCOME EMAIL
          // ============================================
          // Send welcome email to new Google user (non-blocking)
          try {
            await transporter.sendMail({
              from: `"${process.env.EMAIL_FROM_NAME || 'Zoro9x'}" <${process.env.EMAIL_FROM_ADDRESS}>`,
              to: email,
              subject: 'Welcome to Zoro9x! 🎉',
              html: welcomeEmailTemplate(fullName),
              attachments: [{
                filename: 'logo.png',
                path: __dirname + '/../assets/logo.png',
                cid: 'logo'
              }]
            });
            console.log('✅ Welcome email sent to:', email);
          } catch (emailError) {
            console.error('❌ Error sending welcome email:', emailError);
            // Don't fail authentication if email fails
          }
        }

        connection.release();
        return done(null, user);
      } catch (error) {
        console.error('❌ Google OAuth error:', error.message);
        return done(error, null);
      }
    }
  )
);

// ============================================
// SERIALIZE USER
// ============================================
/**
 * Store user data in session
 */
passport.serializeUser((user, done) => {
  done(null, user);
});

// ============================================
// DESERIALIZE USER
// ============================================
/**
 * Retrieve user data from session
 */
passport.deserializeUser((user, done) => {
  done(null, user);
});

module.exports = passport;
