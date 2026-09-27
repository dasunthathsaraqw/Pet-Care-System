import express from "express";
import validatedPetImageUpload from "../middleware/validatedPetImageUpload.js";
import {
  createAdoptablePet,
  getAllAdoptablePets,
  updateAdoptablePet,
  deleteAdoptablePet
} from "../controllers/adoptablePetControllers.js"
import { requireRole } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Routes: public read; mutations restricted to adoption managers (audit finding #1),
// with server-side validated image upload (audit finding #6).
router.post("/", requireRole(["adoption_manager"]), validatedPetImageUpload("Pet_Image"), createAdoptablePet);
router.get("/", getAllAdoptablePets);
router.put("/:id", requireRole(["adoption_manager"]), updateAdoptablePet);
router.delete("/:id", requireRole(["adoption_manager"]), deleteAdoptablePet);

export default router;
