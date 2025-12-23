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
          'SELECT id, email FROM users WHERE email = ?',
          [profile.emails[0].value]
        );

        let user;

        if (existingUser.length > 0) {
          // ============================================
          // USER EXISTS - USE EXISTING
          // ============================================
          user = existingUser[0];
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

          // Insert new user into database
          const [result] = await connection.execute(
            'INSERT INTO users (email, password, fullName) VALUES (?, ?, ?)',
            [email, randomPassword, fullName]
          );

          user = {
            id: result.insertId,
            email: email,
            fullName: fullName,
          };

          console.log(`✅ New user created via Google OAuth: ${email}`);
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
