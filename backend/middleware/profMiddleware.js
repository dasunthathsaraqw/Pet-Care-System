import jwt from 'jsonwebtoken';
import Professional from '../models/professionalModel.js';

export const profAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'professional') { // FIX 5.2
      return res.status(401).json({ message: 'Invalid or expired token' }); // FIX 5.2
    } // FIX 5.2
    const professional = await Professional.findById(decoded.id).select('-ppassword');

    if (!professional) {
      return res.status(401).json({ error: 'Professional not found' });
    }

    req.professional = professional;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Role-based middleware
export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.professional.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};