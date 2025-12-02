# FlowDeck Deployment Guide

## 🚀 Quick Start - Vercel Deployment

### Step 1: Fix Database Setup

Your backend needs a hosted PostgreSQL database. Choose one:

#### Option A: Vercel Postgres (Recommended)
1. Go to your backend project on Vercel dashboard
2. Click **Storage** → **Create Database** → **Postgres**
3. Copy the `POSTGRES_URL` connection string
4. Use this as your `DATABASE_URL`

#### Option B: Supabase (Free)
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Go to **Settings** → **Database**
4. Copy the connection string (URI format)
5. Use as `DATABASE_URL`

#### Option C: Neon (Free Serverless)
1. Go to [neon.tech](https://neon.tech)
2. Create new project
3. Copy connection string
4. Use as `DATABASE_URL`

### Step 2: Set Backend Environment Variables

Go to your backend project on Vercel:
- **Project**: flow-deck-backend
- **Settings** → **Environment Variables**

Add these variables:

```env
DATABASE_URL=postgresql://user:password@host:5432/database
JWT_SECRET=your-64-character-hex-secret-here-example-abc123def456
JWT_REFRESH_SECRET=different-64-character-hex-secret-here-xyz789
FRONTEND_URL=https://flow-deck-delta.vercel.app
NODE_ENV=production
```

**Generate JWT secrets:**
```bash
# Run these commands to generate secure secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 3: Set Frontend Environment Variables

Go to your frontend project on Vercel:
- **Project**: flow-deck
- **Settings** → **Environment Variables**

Add this variable:

```env
NEXT_PUBLIC_API_URL=https://flow-deck-backend.vercel.app
```

### Step 4: Initialize Database Tables

After setting up your hosted database, you need to create the tables:

**Method 1: Using local connection**
```bash
# Update your local .env with the hosted DATABASE_URL
# Then run:
cd backend
node src/db/setup.js
```

**Method 2: Using Vercel CLI**
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Run setup script on Vercel
vercel env pull
node src/db/setup.js
```

**Method 3: Direct SQL**
Connect to your database and run this SQL:

```sql
-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    bio TEXT,
    experience_level VARCHAR(50),
    work_interest VARCHAR(100),
    role VARCHAR(100),
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Create email_verification_tokens table
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create refresh_tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token ON email_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
```

### Step 5: Redeploy Both Projects

After setting environment variables:

**Backend:**
```bash
cd backend
git add .
git commit -m "Fix Vercel deployment configuration"
git push
```

Or trigger manual redeploy on Vercel dashboard.

**Frontend:**
```bash
cd my-app
git add .
git commit -m "Update API configuration"
git push
```

### Step 6: Verify Deployment

1. **Test Backend Health:**
   ```bash
   curl https://flow-deck-backend.vercel.app/health
   ```
   Should return: `{"success": true, "message": "Server is running"}`

2. **Test Frontend:**
   - Visit: https://flow-deck-delta.vercel.app
   - Try to sign up
   - Check browser console for errors

## 🔍 Troubleshooting

### Backend Returns 404
- ✅ Fixed! `vercel.json` now points to correct entry point `src/server.js`
- Redeploy after pushing changes

### CORS Errors
- ✅ Fixed! CORS now configured with proper headers
- Make sure `FRONTEND_URL` is set to `https://flow-deck-delta.vercel.app`

### "Failed to fetch" on Frontend
- Check `NEXT_PUBLIC_API_URL` is set on Vercel
- Verify backend is accessible (test health endpoint)
- Check browser console for actual error

### Database Connection Errors
- Verify `DATABASE_URL` is correct
- Make sure database tables are created
- Check if database allows connections from Vercel IPs

### JWT Errors
- Ensure `JWT_SECRET` and `JWT_REFRESH_SECRET` are set
- Both should be different 64-character hex strings
- Never commit these to git!

## 📋 Environment Variables Checklist

### Backend (flow-deck-backend on Vercel)
- [ ] DATABASE_URL
- [ ] JWT_SECRET
- [ ] JWT_REFRESH_SECRET
- [ ] FRONTEND_URL
- [ ] NODE_ENV

### Frontend (flow-deck on Vercel)
- [ ] NEXT_PUBLIC_API_URL

## 🔐 Security Notes

1. **Never commit `.env` files to git**
2. **Use different JWT secrets for production**
3. **Use strong database passwords**
4. **Enable SSL for database connections**
5. **Keep dependencies updated**

## 📚 Additional Resources

- [Vercel Docs](https://vercel.com/docs)
- [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)
- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [Express.js on Vercel](https://vercel.com/guides/using-express-with-vercel)

---

## What Was Fixed

### 1. Backend vercel.json
**Problem:** Entry point was `server.js` but actual file is at `src/server.js`
**Fix:** Updated to point to correct path

### 2. CORS Configuration
**Problem:** Only allowed localhost:3000
**Fix:** Now uses `FRONTEND_URL` environment variable for production

### 3. Serverless Export
**Problem:** App wasn't exported for Vercel's serverless functions
**Fix:** Added `module.exports = app;` at the end of server.js

### 4. Preflight Requests
**Problem:** CORS preflight OPTIONS requests weren't handled
**Fix:** Added explicit OPTIONS handler with `app.options('*', cors())`

---

**After completing all steps, your app should work on:**
- Frontend: https://flow-deck-delta.vercel.app
- Backend: https://flow-deck-backend.vercel.app
