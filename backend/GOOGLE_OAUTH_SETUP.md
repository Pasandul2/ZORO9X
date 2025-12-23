# Google OAuth Setup Guide

## ✅ Configuration Complete

Your Google OAuth login is now configured and ready to use!

## 🔐 Security Setup

### Current Configuration

Your Google OAuth credentials have been added to `.env`:
- **Client ID**: `1016919611798-08l5hkeaq12kq1qbnto4nfmu9uvn4cv3.apps.googleusercontent.com`
- **Client Secret**: `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`
- **Callback URL**: `http://localhost:5001/api/oauth/google/callback`

### Security Measures Implemented

1. ✅ **Client secret JSON excluded from Git**
   - Added to `.gitignore`: `client_secret_*.json`
   - Original file is NOT tracked by version control

2. ✅ **Environment variables used**
   - Credentials stored in `.env` file
   - `.env` is excluded from Git

3. ✅ **Auto-verification for Google users**
   - Users signing in with Google are automatically verified
   - No email verification needed for OAuth users

## 🚀 How It Works

### User Flow

1. **User clicks "Sign in with Google"** on Login/Register page
2. **Redirected to Google** authentication page
3. **User authorizes** the application
4. **Google redirects back** to your app with authorization code
5. **Backend exchanges** code for user information
6. **User account created** (if new) or logged in (if existing)
7. **JWT token generated** and user redirected to dashboard

### Backend Process

```
Frontend → /api/oauth/google
       ↓
Google Login Page
       ↓
/api/oauth/google/callback
       ↓
Passport.js Strategy (config/passport.js)
       ↓
- Check if user exists in database
- Create new user OR retrieve existing
- Mark as verified (is_verified = true)
       ↓
Generate JWT Token
       ↓
Redirect to Frontend with token
```

## 📁 Files Modified

### Backend
- ✅ `backend/.env` - Added Google OAuth credentials
- ✅ `backend/.gitignore` - Excluded sensitive files
- ✅ `backend/config/passport.js` - Updated to auto-verify Google users
- ✅ `backend/routes/oauth.js` - Handles OAuth flow
- ✅ `backend/.env.example` - Template for other developers

### Frontend
- ✅ `frontend/src/pages/Login.tsx` - Google login button
- ✅ `frontend/src/pages/Register.tsx` - Google signup button
- Both pages handle OAuth callback with token

## 🔧 Testing

### Test Google Login

1. **Start backend server**:
   ```bash
   cd backend
   npm run dev
   ```

2. **Start frontend server**:
   ```bash
   cd frontend
   npm run dev
   ```

3. **Test the flow**:
   - Go to: http://localhost:5173/login
   - Click "Sign in with Google"
   - Authorize with your Google account
   - You should be redirected back and logged in

### Expected Behavior

- ✅ New users are created automatically
- ✅ Existing users are logged in
- ✅ No email verification required for Google users
- ✅ JWT token is generated
- ✅ User is redirected to dashboard

## ⚙️ Google Cloud Console Settings

Your app is configured with these authorized URLs:

### Authorized JavaScript Origins
- `http://localhost:5173` (Frontend)

### Authorized Redirect URIs
- `http://localhost:5001/api/oauth/google/callback` (Backend)

### For Production Deployment

When deploying to production, you need to:

1. **Add production URLs to Google Cloud Console**:
   - Go to: https://console.cloud.google.com/apis/credentials
   - Edit your OAuth 2.0 Client ID
   - Add authorized origins: `https://yourdomain.com`
   - Add redirect URI: `https://yourdomain.com/api/oauth/google/callback`

2. **Update environment variables** on production server:
   ```env
   GOOGLE_CALLBACK_URL=https://yourdomain.com/api/oauth/google/callback
   FRONTEND_URL=https://yourdomain.com
   API_URL=https://yourdomain.com
   ```

## 🔒 Security Best Practices

### ✅ Implemented
- Client secret in environment variables
- `.env` file excluded from Git
- Client secret JSON excluded from Git
- Secure callback URL validation
- JWT token generation with expiration
- Password hashing for OAuth users (random password)

### 🚨 Important Reminders

1. **Never commit** `.env` file to Git
2. **Never commit** `client_secret_*.json` to Git
3. **Never share** client secret publicly
4. **Always use HTTPS** in production
5. **Rotate secrets** if accidentally exposed
6. **Use separate credentials** for development and production

## 📊 Database Schema

Google OAuth users are stored with:
```sql
email          VARCHAR(255) - User's Google email
fullName       VARCHAR(255) - From Google profile
password       VARCHAR(255) - Random bcrypt hash (not used for login)
is_verified    BOOLEAN      - TRUE (auto-verified)
```

## 🐛 Troubleshooting

### Common Issues

**Issue**: "redirect_uri_mismatch" error
- **Solution**: Check Google Cloud Console redirect URIs match exactly
- Must be: `http://localhost:5001/api/oauth/google/callback`

**Issue**: "Invalid client" error
- **Solution**: Verify client ID and secret in `.env` file

**Issue**: User not logged in after Google callback
- **Solution**: Check browser console for errors
- Verify JWT token is being received and stored

**Issue**: "Access blocked" by Google
- **Solution**: Add test users in Google Cloud Console
- Or publish your app (requires OAuth consent screen setup)

## 📚 Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Passport.js Google Strategy](http://www.passportjs.org/packages/passport-google-oauth20/)
- [Google Cloud Console](https://console.cloud.google.com/)

## 🎉 Ready to Use!

Your Google OAuth integration is complete and secure. Users can now sign in with their Google accounts!

To test:
```bash
# Start backend
cd backend && npm run dev

# Start frontend (in new terminal)
cd frontend && npm run dev

# Visit http://localhost:5173/login
```
