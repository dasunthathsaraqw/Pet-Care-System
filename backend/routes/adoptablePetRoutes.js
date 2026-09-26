import express from "express";
import validatedPetImageUpload from "../middleware/validatedPetImageUpload.js";
import {
  createAdoptablePet,
  getAllAdoptablePets,
  updateAdoptablePet,
  deleteAdoptablePet
} from "../controllers/adoptablePetControllers.js"

const router = express.Router();

// Routes
router.post("/", validatedPetImageUpload("Pet_Image"), createAdoptablePet);
router.get("/", getAllAdoptablePets);
router.put("/:id", updateAdoptablePet);
router.delete("/:id", deleteAdoptablePet);

export default router;
