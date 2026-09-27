import express from "express";
import validatedPetImageUpload from "../middleware/validatedPetImageUpload.js";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  addPet,
  getAllAdoptionListings,
  getAdoptionListingById,
  getAdoptionListingsByOwner,
  updateAdoptionListing,
  deleteAdoptionListing
} from "../controllers/forAdoptionControllers.js";

const router = express.Router();

// Routes
// Creating/owning/editing/deleting a listing now requires authentication and
// ownership is enforced in the controller (fix for audit finding #2 IDOR + missing auth).
router.post("/", authMiddleware, validatedPetImageUpload("petImage"), addPet); // Accept image upload

// Get all adoption listings (public browse)
router.get('/', getAllAdoptionListings);

// Get adoption listings by owner's userId (owner or adoption manager)
router.get('/owner/:userId', authMiddleware, getAdoptionListingsByOwner);

// Get specific adoption listing by ID (public browse)
router.get('/:id', getAdoptionListingById);

// Update adoption listing (owner or adoption manager)
router.put('/:id', authMiddleware, validatedPetImageUpload('petImage'), updateAdoptionListing);

// Delete adoption listing (owner or adoption manager)
router.delete('/:id', authMiddleware, deleteAdoptionListing);


export default router;
