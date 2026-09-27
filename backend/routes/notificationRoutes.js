import express from "express";
import {
  sendEventNotification,
  getEventNotifications,
  getUserNotifications,
  markNotificationAsRead,
} from "../controllers/notificationController.js";
import auth from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Broadcasting to attendees is restricted to event managers (fix for audit finding #1).
router.post("/event/:id/send", requireRole(["event_manager"]), sendEventNotification);
router.get("/event/:id", requireRole(["event_manager"]), getEventNotifications);
router.get("/user", auth, getUserNotifications);
router.patch("/:id/read", auth, markNotificationAsRead);

export default router;