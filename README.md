# FlowDeck Backend API

Complete backend system for FlowDeck - AI-Powered Freelance Workspace Platform.

## 🚀 Features

- ✅ **User Authentication** (JWT-based with refresh tokens)
- ✅ **Email Verification** (token-based)
- ✅ **Profile Management** (one-time creation with uniqueness constraint)
- ✅ **Rate Limiting** (protect against abuse)
- ✅ **Input Validation** (Zod schemas)
- ✅ **Secure Password Hashing** (bcrypt with 12 rounds)
- ✅ **Database Transactions** (prevent race conditions)
- ✅ **CORS Protection**
- ✅ **Comprehensive Error Handling**

## 📁 Project Structure

```
backend/
├── src/
│   ├── controllers/
│   │   ├── authController.js      # Authentication logic
│   │   └── userController.js      # User & profile management
│   ├── db/
│   │   ├── db.js                  # PostgreSQL connection pool
│   │   └── setup.js               # Database schema setup
│   ├── middleware/
│   │   ├── auth.js                # JWT authentication
│   │   ├── rateLimiter.js         # Rate limiting configs
│   │   └── validation.js          # Zod validation schemas
│   ├── routes/
│   │   ├── auth.js                # Auth routes
│   │   └── user.js                # User routes
│   └── server.js                  # Express app entry point
├── .env.example                   # Environment variables template
├── .gitignore
├── package.json
└── README.md
```

## 🛠️ Tech Stack

- **Runtime:** Node.js (v18+)
- **Framework:** Express.js
- **Database:** PostgreSQL
- **Authentication:** JWT (jsonwebtoken)
- **Password Hashing:** bcrypt
- **Validation:** Zod
- **Rate Limiting:** express-rate-limit
- **CORS:** cors

## 📦 Installation

### Prerequisites

1. **Node.js** (v18 or higher)
2. **PostgreSQL** (v14 or higher)
3. **npm** or **yarn**

### Step 1: Install PostgreSQL

**Windows:**
```powershell
# Using Chocolatey
choco install postgresql

# Or download from: https://www.postgresql.org/download/windows/
```

**macOS:**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Linux:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### Step 2: Create Database

```bash
# Login to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE flowdeck;

# Exit
\q
```

### Step 3: Clone and Setup Backend

```powershell
# Navigate to backend folder
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
```

### Step 4: Configure Environment Variables

Edit `.env` file:

```env
# Database
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/flowdeck
DB_HOST=localhost
DB_PORT=5432
DB_NAME=flowdeck
DB_USER=postgres
DB_PASSWORD=your_actual_password_here

# JWT Secrets (change these!)
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-long
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-characters

# Email (optional for now)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# Frontend
FRONTEND_URL=http://localhost:3000
```

### Step 5: Setup Database Schema

```powershell
npm run db:setup
```

Expected output:
```
✅ Users table created
✅ Profiles table created
✅ Email verification tokens table created
✅ Refresh tokens table created
✅ Triggers created for automatic timestamp updates
🎉 Database setup completed successfully!
```

### Step 6: Start Server

```powershell
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

Server will start on `http://localhost:5000`

## 🔌 API Endpoints

### Authentication Routes

#### 1. Signup
```http
POST /api/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123",
  "fullName": "John Doe",
  "userType": "freelancer"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "userType": "freelancer",
      "emailVerified": false
    }
  }
}
```

#### 2. Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

#### 3. Verify Email
```http
POST /api/auth/verify-email
Content-Type: application/json

{
  "token": "verification-token-from-email"
}
```

#### 4. Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
```

#### 5. Logout
```http
POST /api/auth/logout
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
```

### User Routes (Protected)

#### 1. Get Current User
```http
GET /api/me
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "emailVerified": true,
    "userType": "freelancer",
    "profile": {
      "id": "uuid",
      "fullName": "John Doe",
      "professionalTitle": "Full Stack Developer",
      "skills": ["JavaScript", "React", "Node.js"],
      "completed": true,
      "completedAt": "2025-11-30T10:00:00Z"
    }
  }
}
```

#### 2. Create Profile (One-time only)
```http
POST /api/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "fullName": "John Doe",
  "professionalTitle": "Full Stack Developer",
  "category": "web-dev",
  "experienceLevel": "3-5",
  "skills": ["JavaScript", "React", "Node.js"],
  "bio": "Passionate developer...",
  "timezone": "America/New_York",
  "country": "United States",
  "portfolioLinks": {
    "github": "https://github.com/johndoe",
    "website": "https://johndoe.com"
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Profile created successfully",
  "data": { ... }
}
```

**Duplicate Attempt (409):**
```json
{
  "success": false,
  "message": "Profile already exists for this user. Use PATCH /api/profile to update.",
  "data": { ... }
}
```

#### 3. Update Profile
```http
PATCH /api/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "bio": "Updated bio text",
  "skills": ["JavaScript", "TypeScript", "React"]
}
```

#### 4. Get Profile by ID (Public)
```http
GET /api/profile/:id
```

## 🔒 Security Features

### 1. Password Requirements
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter  
- At least 1 number

### 2. Rate Limiting
- **Auth endpoints:** 5 attempts per 15 minutes
- **Profile creation:** 3 attempts per hour
- **General API:** 100 requests per 15 minutes

### 3. Database Constraints
- `users.email` - UNIQUE constraint
- `profiles.user_id` - UNIQUE constraint (prevents duplicate profiles)

### 4. Token Management
- Access tokens expire in 7 days
- Refresh tokens expire in 30 days
- Refresh tokens stored in database (can be revoked)

## 🧪 Testing Duplicate Profile Prevention

Test the race condition handling:

```javascript
// Send two simultaneous profile creation requests
Promise.all([
  fetch('http://localhost:5000/api/profile', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer <token>',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fullName: 'Test User', ... })
  }),
  fetch('http://localhost:5000/api/profile', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer <token>',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fullName: 'Test User', ... })
  })
]).then(responses => {
  // One should be 201, one should be 409
  console.log(responses);
});
```

## 🐛 Troubleshooting

### Database Connection Error
```
Error: connect ECONNREFUSED
```
**Solution:** Ensure PostgreSQL is running:
```powershell
# Windows (if installed as service)
net start postgresql-x64-14

# Check status
pg_isready
```

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::5000
```
**Solution:** Change PORT in `.env` or kill the process:
```powershell
# Find process using port 5000
netstat -ano | findstr :5000

# Kill process (replace PID)
taskkill /PID <PID> /F
```

### JWT Secret Error
```
Error: secretOrPrivateKey must have a value
```
**Solution:** Set strong JWT secrets in `.env`:
```env
JWT_SECRET=min-32-characters-random-string-here
JWT_REFRESH_SECRET=another-32-characters-random-string
```

## 📝 Environment Variables Reference

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `PORT` | Server port | No | 5000 |
| `NODE_ENV` | Environment | No | development |
| `DB_HOST` | PostgreSQL host | Yes | localhost |
| `DB_PORT` | PostgreSQL port | Yes | 5432 |
| `DB_NAME` | Database name | Yes | flowdeck |
| `DB_USER` | Database user | Yes | postgres |
| `DB_PASSWORD` | Database password | Yes | - |
| `JWT_SECRET` | Access token secret | Yes | - |
| `JWT_EXPIRE` | Access token expiry | No | 7d |
| `JWT_REFRESH_SECRET` | Refresh token secret | Yes | - |
| `JWT_REFRESH_EXPIRE` | Refresh token expiry | No | 30d |
| `FRONTEND_URL` | Frontend URL for CORS | No | http://localhost:3000 |

## 🚦 Development Workflow

1. **Start PostgreSQL** database
2. **Run** `npm run dev` to start backend
3. **Test** endpoints using Postman/Thunder Client
4. **Monitor** console for logs
5. **Check** database for data integrity

## 📊 Database Schema

```sql
users
  ├── id (uuid, PK)
  ├── email (text, unique, indexed)
  ├── password_hash (text)
  ├── email_verified (boolean)
  ├── user_type (text)
  ├── created_at (timestamptz)
  └── updated_at (timestamptz)

profiles
  ├── id (uuid, PK)
  ├── user_id (uuid, FK → users.id, unique)
  ├── full_name (text)
  ├── display_name (text)
  ├── professional_title (text)
  ├── category (text)
  ├── experience_level (text)
  ├── skills (jsonb)
  ├── bio (text)
  ├── timezone (text)
  ├── country (text)
  ├── avatar_url (text)
  ├── portfolio_links (jsonb)
  ├── completed_at (timestamptz)
  ├── created_at (timestamptz)
  └── updated_at (timestamptz)
```

## 📧 Next Steps

- [ ] Integrate email service (Nodemailer/SendGrid)
- [ ] Add file upload for avatars (multer + S3)
- [ ] Implement password reset flow
- [ ] Add unit tests (Jest)
- [ ] Set up CI/CD pipeline
- [ ] Deploy to production (Heroku/Railway/AWS)

## 📄 License

MIT

---

**Built with ❤️ for FlowDeck**
