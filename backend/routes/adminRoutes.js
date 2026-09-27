import express from 'express';
import { login, getProfile, registerAdmin } from '../controllers/adminController.js';
import adminAuth from '../middleware/adminAuthMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { adminLoginLimiter } from '../middleware/rateLimitMiddleware.js'; // FIX 5.3

const router = express.Router();

// Public routes
router.post('/login', adminLoginLimiter, login); // FIX 5.3

// Protected routes
// Creating admins is now restricted to an authenticated user_admin
// (was public — fix for audit finding #1).
router.post('/register', requireRole(['user_admin']), registerAdmin);
router.get('/profile', adminAuth, getProfile);

export default router;
