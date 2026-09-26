import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js"; // Import Admin model

const adminAuth = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  if (!decoded.adminId) {
    return res.status(403).json({ message: "Admin access required" });
  }

  try {
    const admin = await Admin.findById(decoded.adminId);
    if (!admin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    req.adminId = admin._id;
    req.role = admin.role;
    next();
  } catch (error) {
    return res.status(500).json({ message: "Unable to verify admin access" });
  }
};

export const requireAdminRole = (...allowedRoles) => (req, res, next) => {
  if (!allowedRoles.includes(req.role)) {
    return res.status(403).json({ message: "Insufficient permissions" });
  }

  next();
};

export default adminAuth;
