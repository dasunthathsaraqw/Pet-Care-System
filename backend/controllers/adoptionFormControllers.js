import AdoptionForm from '../models/adoptionForm.js';
import { isAdmin } from '../middleware/roleMiddleware.js';

export const createApplication = async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            email,
            phoneNumber,
            petType,
            petName,
            petImage,
            homeType,
            employmentStatus,
            hasYard,
            hasOtherPets,
            additionalInfo
        } = req.body;

        const application = new AdoptionForm({
            firstName,
            lastName,
            email,
            phoneNumber,
            petType,
            petName,
            petImage,
            homeType,
            employmentStatus,
            hasYard,
            hasOtherPets,
            additionalInfo
        });

        await application.save();
        res.status(201).json(application);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export const getUserApplications = async (req, res) => {
    try {
        if (!req.user || !req.user.email) {
            return res.status(401).json({ error: "Unauthorized: User email is missing" });
        }

        const applications = await AdoptionForm.find({ email: req.user.email });
        res.status(200).json(applications);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getApplicationById = async (req, res) => {
    try {
        const application = await AdoptionForm.findById(req.params.id);
        if (!application) {
            return res.status(404).json({ error: "Application not found" });
        }
        // Ownership: only the applicant (by email) or an adoption manager (fix for audit finding #2 IDOR)
        const owns = req.user?.email && application.email === req.user.email;
        if (!owns && !(await isAdmin(req, ['adoption_manager']))) {
            return res.status(403).json({ error: "Not authorized to view this application" });
        }
        res.status(200).json(application);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const updateApplication = async (req, res) => {
    try {
        const application = await AdoptionForm.findById(req.params.id);
        if (!application) {
            return res.status(404).json({ error: "Application not found" });
        }

        const owns = req.user?.email && application.email === req.user.email;
        const manager = await isAdmin(req, ['adoption_manager']);
        if (!owns && !manager) {
            return res.status(403).json({ error: "Not authorized to update this application" });
        }

        // Only an adoption manager may change the decision status; owners cannot self-approve.
        const updates = { ...req.body };
        if (!manager) {
            delete updates.status;
        }
        // Never allow the owner link to be reassigned.
        delete updates.email;

        const updated = await AdoptionForm.findByIdAndUpdate(req.params.id, updates, { new: true });
        res.status(200).json(updated);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export const deleteApplication = async (req, res) => {
    try {
        const application = await AdoptionForm.findById(req.params.id);
        if (!application) {
            return res.status(404).json({ error: "Application not found" });
        }
        const owns = req.user?.email && application.email === req.user.email;
        if (!owns && !(await isAdmin(req, ['adoption_manager']))) {
            return res.status(403).json({ error: "Not authorized to delete this application" });
        }
        await AdoptionForm.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Application deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getAllApplications = async (req, res) => {
    try {
        const applications = await AdoptionForm.find();
        res.status(200).json(applications);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
