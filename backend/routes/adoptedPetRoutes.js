import express from "express";
import {
  createAdoptedPet,
  getAllAdoptedPets,
  updateAdoptedPet,
  deleteAdoptedPet,
  moveToAdoptedPet
} from "../controllers/adoptedPetControllers.js";
import { requireRole } from "../middleware/roleMiddleware.js";

const router = express.Router();

// CRUD routes (mutations restricted to adoption managers — fix for audit finding #1)
router.post("/", requireRole(["adoption_manager"]), createAdoptedPet);
router.get("/", getAllAdoptedPets);
router.put("/:id", requireRole(["adoption_manager"]), updateAdoptedPet);
router.delete("/:id", requireRole(["adoption_manager"]), deleteAdoptedPet);

// Move from AdoptablePet to AdoptedPet
router.post("/move/:id", requireRole(["adoption_manager"]), moveToAdoptedPet);

export default router; 