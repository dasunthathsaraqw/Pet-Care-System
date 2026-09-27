import express from "express";
import multer from "multer";
import {
  createAdoptablePet,
  getAllAdoptablePets,
  updateAdoptablePet,
  deleteAdoptablePet
} from "../controllers/adoptablePetControllers.js"
import { requireRole } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Image Storage
const storage = multer.diskStorage({
  destination: "./uploads/",
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

// Routes (public read; mutations restricted to adoption managers — fix for audit finding #1)
router.post("/", requireRole(["adoption_manager"]), upload.single("Pet_Image"), createAdoptablePet);
router.get("/", getAllAdoptablePets);
router.put("/:id", requireRole(["adoption_manager"]), updateAdoptablePet);
router.delete("/:id", requireRole(["adoption_manager"]), deleteAdoptablePet);

export default router;
