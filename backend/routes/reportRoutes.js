import express from "express";
import {
  getRegistrationsPerEvent,
  getRevenuePerEvent,
  getRegistrationTrends,
  getEventStatusBreakdown,
  getRegistrationsByLocation,
  getRefundedRegistrations,
} from "../controllers/reportController.js";
import auth from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Event registration/revenue analytics — event managers only (fix for audit finding #1).
router.get("/registrations-per-event", requireRole(["event_manager"]), getRegistrationsPerEvent);

router.get("/revenue-per-event", requireRole(["event_manager"]), getRevenuePerEvent);

router.get("/registration-trends", requireRole(["event_manager"]), getRegistrationTrends);

router.get("/event-status-breakdown", requireRole(["event_manager"]), getEventStatusBreakdown);

router.get("/registrations-by-location", requireRole(["event_manager"]), getRegistrationsByLocation);

router.get("/refunded-registrations", requireRole(["event_manager"]), getRefundedRegistrations);

export default router;