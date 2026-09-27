import express from 'express';
import {
  createHomeVisit,
  getAllHomeVisits,
  getHomeVisitById,
  updateHomeVisit,
  deleteHomeVisit,
  getUserHomeVisits,
  rejectHomeVisitsByForm
} from '../controllers/homeVisitControllers.js';
import authMiddleware from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Protected routes (require authentication)
router.use(authMiddleware);

// Get all home visits (adoption managers only — fix for audit finding #2)
router.get('/', requireRole(['adoption_manager']), getAllHomeVisits);

// Get home visits for a specific user
router.get('/my-visits', getUserHomeVisits);

// Create a new home visit
router.post('/', createHomeVisit);

// Get, update, or delete a specific home visit
router.get('/:id', getHomeVisitById);
router.put('/:id', updateHomeVisit);
router.delete('/:id', deleteHomeVisit);

// Add this route for rejecting all home visits by adoptionFormId (adoption managers only)
router.put('/by-form/:formId/reject', requireRole(['adoption_manager']), rejectHomeVisitsByForm);

export default router; 