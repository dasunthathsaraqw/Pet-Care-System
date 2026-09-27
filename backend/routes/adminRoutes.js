import express from 'express';
import { login, getProfile, registerAdmin } from '../controllers/adminController.js';
import adminAuth from '../middleware/adminAuthMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Public routes
router.post('/login', login);

// Protected routes
// Creating admins is now restricted to an authenticated user_admin
// (was public — fix for audit finding #1).
router.post('/register', requireRole(['user_admin']), registerAdmin);
router.get('/profile', adminAuth, getProfile);

export default router;
