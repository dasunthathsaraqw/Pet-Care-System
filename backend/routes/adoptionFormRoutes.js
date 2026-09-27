import express from 'express';
import {
  createApplication,
  getUserApplications,
  updateApplication,
  updateApplicationStatus,
  deleteApplication,
  getAllApplications,
  getApplicationById
} from '../controllers/adoptionFormControllers.js';
import authMiddleware from "../middleware/authMiddleware.js";
import adminAuth, { requireAdminRole } from "../middleware/adminAuthMiddleware.js";

const router = express.Router();

// Specific routes first
router.post('/apply', createApplication);
router.get('/my-applications', authMiddleware, getUserApplications);
router.get('/all', authMiddleware, getAllApplications);

// Parameterized routes last
router.get('/:id', authMiddleware, getApplicationById);
router.put('/update/:id', authMiddleware, updateApplication);
router.patch('/status/:id', adminAuth, requireAdminRole('adoption_manager'), updateApplicationStatus);
router.delete('/delete/:id', authMiddleware, deleteApplication);

export default router;
