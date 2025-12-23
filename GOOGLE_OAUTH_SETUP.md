# Google OAuth Setup Guide

## Step 1: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Go to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client ID**
5. Choose **Web Application**
6. Set Authorized redirect URIs:
   - `http://localhost:5001/api/oauth/google/callback` (Development)
   - `https://yourdomain.com/api/oauth/google/callback` (Production)

## Step 2: Get Your Credentials

Copy these from the credentials page:
- **Client ID**
- **Client Secret**

## Step 3: Add to .env

Update `/backend/.env`:

```
GOOGLE_CLIENT_ID=your_client_id_from_google_console
GOOGLE_CLIENT_SECRET=your_client_secret_from_google_console
GOOGLE_CALLBACK_URL=http://localhost:5001/api/oauth/google/callback
```

## Step 4: Frontend Configuration

If you want to use Google Sign-In Button on frontend (optional):

Install: `npm install @react-oauth/google`

Then wrap your app with GoogleOAuthProvider in App.tsx:

```tsx
import { GoogleOAuthProvider } from '@react-oauth/google';

<GoogleOAuthProvider clientId="YOUR_CLIENT_ID">
  {/* Your app */}
</GoogleOAuthProvider>
```

## How It Works

1. User clicks "Sign in with Google" button
2. Redirects to Google login page
3. Google calls our callback URL with user data
4. We create/find user in database
5. Generate JWT token
6. Redirect back to frontend with token
7. Token is saved to localStorage
8. User is logged in!

## API Endpoints

### Email/Password Login
```
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}
```

### Email/Password Register
```
POST /api/auth/register
{
  "fullName": "John Doe",
  "email": "user@example.com",
  "password": "password123",
  "phone": "1234567890" (optional)
}
```

### Google OAuth
```
GET /api/oauth/google
(Redirects to Google login)
```

### Get User Profile (Protected)
```
GET /api/auth/profile
Headers: Authorization: Bearer <token>
```

## Testing

1. Start backend: `npm run dev`
2. Start frontend: `npm run dev`
3. Go to login page
4. Click "Sign in with Google"
5. Complete Google login
6. Should redirect to home page logged in!
