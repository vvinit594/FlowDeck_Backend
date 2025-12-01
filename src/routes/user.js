import express from 'express';
import { getMe, createProfile, updateProfile, getProfileById } from '../controllers/userController.js';
import { authMiddleware, optionalAuth } from '../middleware/auth.js';
import { validate, profileSchema, updateProfileSchema } from '../middleware/validation.js';
import { profileLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// GET /api/me - Get current user with profile
router.get('/me', authMiddleware, getMe);

// POST /api/profile - Create profile (one-time, enforced by DB constraint)
router.post('/profile', authMiddleware, profileLimiter, validate(profileSchema), createProfile);

// PATCH /api/profile - Update profile
router.patch('/profile', authMiddleware, validate(updateProfileSchema), updateProfile);

// GET /api/profile/:id - Get profile by ID (public, optional auth)
router.get('/profile/:id', optionalAuth, getProfileById);

export default router;
