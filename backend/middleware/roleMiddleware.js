// Function-level access control (fix for audit finding #1).
//
// requireRole([...roles]) authenticates an ADMIN principal and authorizes by
// role. The role is taken from the *verified* JWT's adminId and then
// re-checked against the database, so req.body / req.query can never influence
// the role, and a token issued to an admin whose role was changed/revoked no
// longer grants the old access.
//
// allowSelfOrAdmin lets a normal user act only on their own account, while a
// user_admin may act on anyone. Used for DELETE user-by-id.

import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";
import User from "../models/User.js";

const extractToken = (req) => {
  const header = req.headers.authorization || req.header?.("Authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7) : header.split(" ")[1] || null;
};

export const requireRole = (allowedRoles = []) => {
  const allowed = allowedRoles.map((r) => r.toLowerCase());
  return async (req, res, next) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Only admin tokens carry a role; anything else is not authorized here.
      if (!decoded.adminId) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      // Re-fetch from DB so the role is authoritative, not whatever the token claims.
      const admin = await Admin.findById(decoded.adminId).select("role");
      if (!admin) {
        return res.status(401).json({ message: "Account no longer exists" });
      }

      const role = (admin.role || "").toLowerCase();
      if (allowed.length > 0 && !allowed.includes(role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      req.adminId = decoded.adminId;
      req.role = role;
      next();
    } catch (error) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
  };
};

export const allowSelfOrAdmin = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Admin path: only user_admin may delete other users.
    if (decoded.adminId) {
      const admin = await Admin.findById(decoded.adminId).select("role");
      if (!admin) {
        return res.status(401).json({ message: "Account no longer exists" });
      }
      if ((admin.role || "").toLowerCase() !== "user_admin") {
        return res.status(403).json({ message: "Insufficient permissions" });
      }
      req.adminId = decoded.adminId;
      req.role = (admin.role || "").toLowerCase();
      return next();
    }

    // User path: may only act on their own account.
    if (decoded.userId) {
      if (String(decoded.userId) !== String(req.params.id)) {
        return res.status(403).json({ message: "You can only delete your own profile" });
      }
      const user = await User.findById(decoded.userId).select("_id");
      if (!user) {
        return res.status(401).json({ message: "Account no longer exists" });
      }
      req.user = decoded;
      return next();
    }

    return res.status(403).json({ message: "Insufficient permissions" });
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
