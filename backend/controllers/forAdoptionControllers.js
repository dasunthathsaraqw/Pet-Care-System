import ForAdoption from "../models/ForAdoption.js";
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const uploadsDirectory = path.join(__dirname, '..', 'uploads');

async function removeNewUploadedImage(file) {
    if (!file?.path) return;
    try {
        await fs.promises.rm(file.path, { force: true });
    } catch (error) {
        console.error('Error removing new uploaded image:', error);
    }
}

function storedUploadPath(imageUrl) {
    if (typeof imageUrl !== 'string' || !imageUrl.startsWith('/uploads/')) return null;
    const filename = imageUrl.slice('/uploads/'.length);
    if (!filename || filename.includes('/') || filename.includes('\\') || filename.includes(':')) return null;
    const imagePath = path.resolve(uploadsDirectory, filename);
    return path.dirname(imagePath) === uploadsDirectory ? imagePath : null;
}

// Add a pet for adoption (with image)
export const addPet = async (req, res) => {
    let saved = false;
    try {
        console.log('Received request body:', req.body);
        console.log('Received file:', req.file);

        const {
            userId,
            ownerFirstName,
            ownerLastName,
            email,
            phone,
            petName,
            petAge,
            petGender,
            petBreed,
            petSpecies,
            petDescription,
            reason,
            specialNeeds,
            vaccinated,
            neutered
        } = req.body;

        console.log('Adding pet with data:', {
            userId,
            ownerName: `${ownerFirstName} ${ownerLastName}`,
            email,
            phone,
            petName,
            specialNeeds,
            vaccinated,
            neutered
        });

        const newPet = new ForAdoption({
            userId,
            ownerFirstName,
            ownerLastName,
            email,
            phone,
            petName,
            petAge,
            petGender,
            petBreed,
            petSpecies,
            petDescription,
            reason,
            specialNeeds,
            vaccinated,
            neutered,
            petImage: req.file ? `/uploads/${req.file.filename}` : null,
        });

        console.log('Created new pet object:', newPet);

        await newPet.save();
        saved = true;
        console.log('Saved pet:', {
            _id: newPet._id,
            userId: newPet.userId,
            ownerName: `${newPet.ownerFirstName} ${newPet.ownerLastName}`,
            email: newPet.email,
            petName: newPet.petName
        });
        res.status(201).json({ message: "Pet added for adoption successfully", newPet });
    } catch (error) {
        if (!saved) await removeNewUploadedImage(req.file);
        console.error('Error adding pet:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get all adoption listings
export const getAllAdoptionListings = async (req, res) => {
    try {
        const userId = req.query.userId;
        const query = userId ? { userId } : {};
        const listings = await ForAdoption.find(query);
        res.status(200).json(listings);
    } catch (error) {
        console.error('Error fetching adoption listings:', error);
        res.status(500).json({ message: 'Failed to fetch adoption listings', error: error.message });
    }
};

// Get a single adoption listing by ID
export const getAdoptionListingById = async (req, res) => {
    try {
        const listing = await ForAdoption.findById(req.params.id);
        if (!listing) {
            return res.status(404).json({ message: 'Adoption listing not found' });
        }
        res.status(200).json(listing);
    } catch (error) {
        console.error('Error fetching adoption listing:', error);
        res.status(500).json({ message: 'Failed to fetch adoption listing', error: error.message });
    }
};

// Get adoption listings by owner
export const getAdoptionListingsByOwner = async (req, res) => {
    try {
        const userId = req.params.userId;
        console.log('Fetching pets for userId:', userId);
        
        // First, let's see all pets in the database
        const allPets = await ForAdoption.find({});
        console.log('All pets in database:', allPets.map(pet => ({ 
            _id: pet._id, 
            userId: pet.userId, 
            ownerName: `${pet.ownerFirstName} ${pet.ownerLastName}`,
            email: pet.email 
        })));
        
        // Now let's find pets for this specific user
        const listings = await ForAdoption.find({ userId: userId });
        console.log('Found listings for user:', listings.map(pet => ({ 
            _id: pet._id, 
            userId: pet.userId, 
            ownerName: `${pet.ownerFirstName} ${pet.ownerLastName}`,
            email: pet.email 
        })));
        
        res.status(200).json(listings);
    } catch (error) {
        console.error('Error fetching owner adoption listings:', error);
        res.status(500).json({ message: 'Failed to fetch owner adoption listings', error: error.message });
    }
};

// Update adoption listing
export const updateAdoptionListing = async (req, res) => {
    let updated = false;
    try {
        const listingId = req.params.id;
        const listing = await ForAdoption.findById(listingId);
        
        if (!listing) {
            await removeNewUploadedImage(req.file);
            return res.status(404).json({ message: 'Adoption listing not found' });
        }
        
        // Only allow updating pet-related fields
        const allowedFields = [
            'petName',
            'petAge',
            'petGender',
            'petBreed',
            'petSpecies',
            'petDescription',
            'reason',
            'specialNeeds',
            'vaccinated',
            'neutered'
        ];
        
        // Filter out any fields that are not in allowedFields
        const updatedData = {};
        for (const field of allowedFields) {
            if (field in req.body) {
                updatedData[field] = req.body[field];
            }
        }
        
        // Convert string boolean values to actual booleans
        ['specialNeeds', 'vaccinated', 'neutered'].forEach(field => {
            if (field in updatedData) {
                updatedData[field] = updatedData[field] === 'true';
            }
        });
        
        // Handle image upload if a new image is provided
        if (req.file) {
            updatedData.petImage = `/uploads/${req.file.filename}`;
        }
        
        const updatedListing = await ForAdoption.findByIdAndUpdate(
            listingId,
            { $set: updatedData },
            { new: true }
        );
        if (!updatedListing) {
            await removeNewUploadedImage(req.file);
            return res.status(404).json({ message: 'Adoption listing not found' });
        }
        updated = true;

        // Remove the previous image only after the new path is saved.
        if (req.file && listing.petImage) {
            const oldImagePath = storedUploadPath(listing.petImage);
            if (oldImagePath) {
                try {
                    await fs.promises.rm(oldImagePath, { force: true });
                } catch (err) {
                    console.error('Error deleting old image:', err);
                }
            }
        }
        
        res.status(200).json(updatedListing);
    } catch (error) {
        if (!updated) await removeNewUploadedImage(req.file);
        console.error('Error updating adoption listing:', error);
        res.status(500).json({ message: 'Failed to update adoption listing', error: error.message });
    }
};

// Delete adoption listing
export const deleteAdoptionListing = async (req, res) => {
    try {
        const listingId = req.params.id;
        const listing = await ForAdoption.findById(listingId);
        
        if (!listing) {
            return res.status(404).json({ message: 'Adoption listing not found' });
        }
        
        // Delete associated image if it exists
        if (listing.petImage) {
            const imagePath = path.join(__dirname, '..', listing.petImage);
            try {
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            } catch (err) {
                console.error('Error deleting image file:', err);
                // Continue with deletion even if image deletion fails
            }
        }
        
        await ForAdoption.findByIdAndDelete(listingId);
        res.status(200).json({ message: 'Adoption listing deleted successfully' });
    } catch (error) {
        console.error('Error deleting adoption listing:', error);
        res.status(500).json({ message: 'Failed to delete adoption listing', error: error.message });
    }
};
