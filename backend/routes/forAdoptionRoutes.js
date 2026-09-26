import express from "express";
import validatedPetImageUpload from "../middleware/validatedPetImageUpload.js";
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
router.post("/", validatedPetImageUpload("petImage"), addPet); // Accept image upload

// Get all adoption listings
router.get('/', getAllAdoptionListings);

// Get adoption listings by owner's userId
router.get('/owner/:userId', getAdoptionListingsByOwner);

// Get specific adoption listing by ID
router.get('/:id', getAdoptionListingById);

// Update adoption listing
router.put('/:id', validatedPetImageUpload('petImage'), updateAdoptionListing);

// Delete adoption listing
router.delete('/:id', deleteAdoptionListing);


export default router;
