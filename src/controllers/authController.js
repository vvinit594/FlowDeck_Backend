import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../db/db.js';
import { v4 as uuidv4 } from 'uuid';

const SALT_ROUNDS = 12;

export const signup = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { email, password, fullName, userType } = req.validatedData;

    await client.query('BEGIN');

    // Check if user already exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const userResult = await client.query(
      `INSERT INTO users (email, password_hash, user_type, email_verified)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, user_type, email_verified, created_at`,
      [email.toLowerCase(), passwordHash, userType || 'freelancer', false]
    );

    const user = userResult.rows[0];

    // Create verification token
    const verificationToken = uuidv4();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await client.query(
      `INSERT INTO email_verification_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, verificationToken, expiresAt]
    );

    // If fullName provided, create basic profile
    if (fullName) {
      await client.query(
        `INSERT INTO profiles (user_id, full_name)
         VALUES ($1, $2)`,
        [user.id, fullName]
      );
    }

    await client.query('COMMIT');

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        userType: user.user_type
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    // Generate refresh token
    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d' }
    );

    // Store refresh token
    const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await client.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, refreshToken, refreshExpiresAt]
    );

    // TODO: Send verification email
    console.log(`📧 Verification token for ${email}: ${verificationToken}`);
    console.log(`📧 Verification link: ${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`);

    res.status(201).json({
      success: true,
      message: 'Account created successfully. Please check your email to verify your account.',
      data: {
        token,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          userType: user.user_type,
          emailVerified: user.email_verified,
          createdAt: user.created_at
        }
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Signup error:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Error creating account';
    
    if (error.code === '23505') { // Unique violation
      errorMessage = 'User with this email already exists';
    } else if (error.code === '23503') { // Foreign key violation
      errorMessage = 'Invalid data provided';
    } else if (error.code === '23502') { // Not null violation
      errorMessage = 'Required field is missing';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(500).json({
      success: false,
      message: errorMessage,
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  } finally {
    client.release();
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.validatedData;

    // Get user
    const result = await pool.query(
      'SELECT id, email, password_hash, user_type, email_verified FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate tokens
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        userType: user.user_type
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d' }
    );

    // Store refresh token
    const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, refreshToken, refreshExpiresAt]
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          userType: user.user_type,
          emailVerified: user.email_verified
        }
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during login'
    });
  }
};

export const verifyEmail = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { token } = req.body;

    await client.query('BEGIN');

    // Find token
    const tokenResult = await client.query(
      `SELECT user_id, expires_at FROM email_verification_tokens 
       WHERE token = $1`,
      [token]
    );

    if (tokenResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Invalid verification token'
      });
    }

    const { user_id, expires_at } = tokenResult.rows[0];

    // Check if expired
    if (new Date(expires_at) < new Date()) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Verification token has expired'
      });
    }

    // Update user
    await client.query(
      'UPDATE users SET email_verified = true WHERE id = $1',
      [user_id]
    );

    // Delete token
    await client.query(
      'DELETE FROM email_verification_tokens WHERE token = $1',
      [token]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Email verified successfully'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying email'
    });
  } finally {
    client.release();
  }
};

export const refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Check if token exists in database
    const tokenResult = await pool.query(
      `SELECT user_id, expires_at FROM refresh_tokens 
       WHERE token = $1 AND user_id = $2`,
      [refreshToken, decoded.userId]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    const { user_id, expires_at } = tokenResult.rows[0];

    // Check if expired
    if (new Date(expires_at) < new Date()) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token has expired'
      });
    }

    // Get user info
    const userResult = await pool.query(
      'SELECT email, user_type FROM users WHERE id = $1',
      [user_id]
    );

    const user = userResult.rows[0];

    // Generate new access token
    const newAccessToken = jwt.sign(
      { 
        userId: user_id, 
        email: user.email,
        userType: user.user_type
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.json({
      success: true,
      data: {
        token: newAccessToken
      }
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid or expired refresh token'
    });
  }
};

export const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      // Delete refresh token from database
      await pool.query(
        'DELETE FROM refresh_tokens WHERE token = $1',
        [refreshToken]
      );
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during logout'
    });
  }
};
