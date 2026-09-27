// routes/petRoutes.js
import express from 'express';
import ForAdoption from '../models/ForAdoption.js';
import AdoptablePet from '../models/AdoptablePet.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Move one pet by ID (adoption managers only — fix for audit finding #1)
router.post('/movePet/:id', requireRole(['adoption_manager']), async (req, res) => {
    try {
      const pet = await ForAdoption.findById(req.params.id);
      if (!pet) return res.status(404).json({ message: 'Pet not found' });
  
      const newAdoptedPet = new AdoptablePet(pet.toObject());
      await newAdoptedPet.save();
  
      res.status(200).json({ message: 'Pet moved successfully!' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

export default router;
