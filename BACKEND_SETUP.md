# ZORO9X Backend API

Complete authentication backend with Email/Password and Google OAuth support.

## 🚀 Quick Start

### 1. **Install Dependencies**
```bash
npm install
```

### 2. **Configure Environment Variables**
Create `.env` file:
```
PORT=5001
NODE_ENV=development

# Database Configuration (XAMPP MySQL)
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=zoro9x

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_change_this_in_production_12345678
JWT_EXPIRE=7d

# API Configuration
API_URL=http://localhost:5001
FRONTEND_URL=http://localhost:5173

# Encryption
BCRYPT_ROUNDS=10

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:5001/api/oauth/google/callback

# Session
SESSION_SECRET=your_session_secret_change_this_in_production_98765432
```

### 3. **Start XAMPP MySQL**
- Open XAMPP Control Panel
- Start MySQL server
- Ensure database `zoro9x` exists

### 4. **Start Backend**
```bash
npm run dev
```

Server will run on `http://localhost:5001`

## 📁 Project Structure

```
backend/
├── config/
│   ├── database.js      # MySQL connection pool
│   ├── schema.js        # Database table creation
│   └── passport.js      # Google OAuth configuration
├── controllers/
│   └── authController.js # Login, Register, Profile logic
├── middleware/
│   └── auth.js          # JWT token verification
├── routes/
│   ├── auth.js          # Authentication routes
│   └── oauth.js         # Google OAuth routes
├── index.js             # Main server file
├── .env                 # Environment variables
├── package.json         # Dependencies
└── README.md           # This file
```

## 🔐 Authentication

### Email/Password Authentication
- **Register:** `POST /api/auth/register`
- **Login:** `POST /api/auth/login`
- **Profile:** `GET /api/auth/profile` (Protected)

### Google OAuth
- **Google Login:** `GET /api/oauth/google`
- **Callback:** `GET /api/oauth/google/callback`

## 📊 Database Schema

### Users Table
```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  fullName VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)
```

## 🔌 API Endpoints

### Register
```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "fullName": "John Doe",
  "phone": "1234567890"
}

Response:
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "fullName": "John Doe"
  },
  "token": "eyJhbGc..."
}
```

### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "fullName": "John Doe"
  },
  "token": "eyJhbGc..."
}
```

### Get Profile (Protected)
```bash
GET /api/auth/profile
Authorization: Bearer <token>

Response:
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "fullName": "John Doe",
    "phone": "1234567890",
    "created_at": "2025-12-23 12:00:00"
  }
}
```

### Health Check
```bash
GET /api/health

Response:
{
  "status": "OK",
  "timestamp": "2025-12-23T12:00:00.000Z",
  "uptime": 12345.67
}
```

## 🔑 Security Features

✅ **Password Security**
- Bcryptjs hashing with 10 salt rounds
- Never store plain passwords

✅ **JWT Authentication**
- Token-based authentication
- 7-day expiration by default
- Refresh token support (coming soon)

✅ **SQL Injection Prevention**
- Parameterized queries with mysql2/promise
- Input validation on all endpoints

✅ **CORS Protection**
- Whitelist frontend URL
- Credentials support

✅ **Google OAuth**
- Secure OAuth 2.0 flow
- Auto user creation
- Session management

## 🛠️ Technologies

- **Express.js** - Web framework
- **MySQL2** - Database driver
- **Bcryptjs** - Password hashing
- **JWT** - Token generation
- **Passport.js** - OAuth authentication
- **Nodemon** - Development server

## 📝 Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| PORT | Server port | 5001 |
| DB_HOST | MySQL host | localhost |
| DB_NAME | Database name | zoro9x |
| JWT_SECRET | Token signing key | abc123... |
| GOOGLE_CLIENT_ID | Google OAuth ID | xxx.apps.googleusercontent.com |
| GOOGLE_CLIENT_SECRET | Google OAuth secret | GOCSPX-xxx |

## 🚨 Debugging

### Database Connection Failed
- Ensure XAMPP MySQL is running
- Check `.env` database credentials
- Verify `zoro9x` database exists

### Google OAuth Not Working
- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- Check `GOOGLE_CALLBACK_URL` matches Google Console
- Ensure `FRONTEND_URL` is correct

### Token Verification Failed
- Check token format: `Bearer <token>`
- Verify token not expired
- Ensure `JWT_SECRET` matches in `.env`

## 📚 Further Reading

- [Express.js Documentation](https://expressjs.com/)
- [JWT Handbook](https://auth0.com/resources/ebooks/jwt-handbook)
- [Passport.js Strategies](http://www.passportjs.org/strategies/)
- [MySQL Documentation](https://dev.mysql.com/doc/)

## 📄 License

MIT
