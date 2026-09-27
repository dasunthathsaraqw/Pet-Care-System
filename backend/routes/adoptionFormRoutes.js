import express from 'express';
import {
  createApplication,
  getUserApplications,
  updateApplication,
  deleteApplication,
  getAllApplications,
  getApplicationById
} from '../controllers/adoptionFormControllers.js';
import authMiddleware from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Specific routes first
router.post('/apply', createApplication);
router.get('/my-applications', authMiddleware, getUserApplications);
// Listing every applicant's PII is an adoption-manager operation (fix for audit finding #2)
router.get('/all', requireRole(['adoption_manager']), getAllApplications);

// Parameterized routes last
router.get('/:id', authMiddleware, getApplicationById);
router.put('/update/:id', authMiddleware, updateApplication);
router.delete('/delete/:id', authMiddleware, deleteApplication);

export default router;
