import AdoptionForm from '../models/adoptionForm.js';

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
        res.status(200).json(application);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const updateApplication = async (req, res) => {
    try {
        const editableFields = ['homeType', 'employmentStatus', 'hasYard', 'hasOtherPets', 'additionalInfo'];
        const submittedFields = req.body ?? {};
        const updates = {};

        for (const field of editableFields) {
            if (Object.prototype.hasOwnProperty.call(submittedFields, field)) {
                updates[field] = submittedFields[field];
            }
        }

        const application = await AdoptionForm.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true });
        res.status(200).json(application);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export const updateApplicationStatus = async (req, res) => {
    try {
        const submittedFields = req.body ?? {};
        const allowedStatuses = AdoptionForm.schema.path('status').enumValues;

        if (Object.keys(submittedFields).some(field => field !== 'status') ||
            !allowedStatuses.includes(submittedFields.status)) {
            return res.status(400).json({ error: 'Invalid status update' });
        }

        const application = await AdoptionForm.findByIdAndUpdate(
            req.params.id,
            { $set: { status: submittedFields.status } },
            { new: true, runValidators: true }
        );
        res.status(200).json(application);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export const deleteApplication = async (req, res) => {
    try {
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
