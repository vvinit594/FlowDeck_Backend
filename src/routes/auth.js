import express from 'express';
import { signup, login, verifyEmail, refreshAccessToken, logout } from '../controllers/authController.js';
import { validate, signupSchema, loginSchema } from '../middleware/validation.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// POST /api/auth/signup
router.post('/signup', authLimiter, validate(signupSchema), signup);

// POST /api/auth/login
router.post('/login', authLimiter, validate(loginSchema), login);

// POST /api/auth/verify-email
router.post('/verify-email', verifyEmail);

// POST /api/auth/refresh
router.post('/refresh', refreshAccessToken);

// POST /api/auth/logout
router.post('/logout', logout);

export default router;
