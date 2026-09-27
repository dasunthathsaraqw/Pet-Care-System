import express from "express";
import {
  createEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  deleteEvent,
} from "../controllers/eventController.js";
import upload from "../middleware/multer.js";
import { requireRole } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Public reads; create/update/delete restricted to event managers (fix for audit finding #1).
router.post("/", requireRole(["event_manager"]), upload.single("eventImage"), createEvent);
router.get("/", getAllEvents);
router.get("/:id", getEventById);
router.put("/:id", requireRole(["event_manager"]), upload.single("eventImage"), updateEvent);
router.delete("/:id", requireRole(["event_manager"]), deleteEvent);

export default router;