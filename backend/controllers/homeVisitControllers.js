import HomeVisit from '../models/HomeVisit.js';
import { isAdmin } from '../middleware/roleMiddleware.js';

export const createHomeVisit = async (req, res) => {
  try {
    const homeVisit = new HomeVisit(req.body);
    await homeVisit.save();
    res.status(201).json(homeVisit);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getAllHomeVisits = async (req, res) => {
  try {
    const homeVisits = await HomeVisit.find();
    res.status(200).json(homeVisits);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Owner = the adopter whose email matches the visit; adoption managers may also act.
const canAccessVisit = async (req, homeVisit) => {
  const owns = req.user?.email && homeVisit.adopterEmail === req.user.email;
  return owns || (await isAdmin(req, ['adoption_manager']));
};

export const getHomeVisitById = async (req, res) => {
  try {
    const homeVisit = await HomeVisit.findById(req.params.id);
    if (!homeVisit) {
      return res.status(404).json({ error: 'Home visit not found' });
    }
    // Ownership check (fix for audit finding #2 IDOR)
    if (!(await canAccessVisit(req, homeVisit))) {
      return res.status(403).json({ error: 'Not authorized to view this home visit' });
    }
    res.status(200).json(homeVisit);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateHomeVisit = async (req, res) => {
  try {
    const existing = await HomeVisit.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Home visit not found' });
    }
    // Ownership check (fix for audit finding #2 IDOR)
    if (!(await canAccessVisit(req, existing))) {
      return res.status(403).json({ error: 'Not authorized to update this home visit' });
    }
    // Never allow the owner link to be reassigned.
    const updates = { ...req.body };
    delete updates.adopterEmail;
    const homeVisit = await HomeVisit.findByIdAndUpdate(req.params.id, updates, { new: true });
    res.status(200).json(homeVisit);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const deleteHomeVisit = async (req, res) => {
  try {
    const existing = await HomeVisit.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Home visit not found' });
    }
    // Ownership check (fix for audit finding #2 IDOR)
    if (!(await canAccessVisit(req, existing))) {
      return res.status(403).json({ error: 'Not authorized to delete this home visit' });
    }
    await HomeVisit.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Home visit deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getUserHomeVisits = async (req, res) => {
  try {
    const { email } = req.user;
    const homeVisits = await HomeVisit.find({ adopterEmail: email });
    res.status(200).json(homeVisits);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const rejectHomeVisitsByForm = async (req, res) => {
  try {
    const { formId } = req.params;
    const result = await HomeVisit.updateMany(
      { adoptionFormId: formId },
      { $set: { userResponse: 'rejected', status: 'rejected' } }
    );
    res.status(200).json({ message: 'Home visits rejected', result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}; 