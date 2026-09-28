import Admin from "../models/Admin.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// NOTE: this route is now gated behind requireRole(['user_admin']) (see
// routes/adminRoutes.js), so only an authenticated user_admin can reach it.
// The requested role is validated against the allowed set instead of being
// trusted blindly from the request body (fix for audit finding #1 mass-assignment).
const ALLOWED_ADMIN_ROLES = [
  "user_admin",
  "event_manager",
  "adoption_manager",
  "appointment_manager",
  "store_manager",
];

export const registerAdmin = async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    // Validate the requested role against the allowed set (never trust it blindly).
    const normalizedRole = typeof role === "string" ? role.toLowerCase() : "";
    if (!ALLOWED_ADMIN_ROLES.includes(normalizedRole)) {
      return res.status(400).json({
        message: `Invalid role. Allowed roles: ${ALLOWED_ADMIN_ROLES.join(", ")}`,
      });
    }

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res
        .status(400)
        .json({ message: "Admin with this email already exists" });
    }

    // Create new admin (password will be hashed by pre-save hook)
    const admin = new Admin({
      name,
      email,
      password,
      role: normalizedRole,
    });

    await admin.save();

    res.status(201).json({ message: "Admin registered successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error registering admin", error: error.message });
  }
};

// Admin login
export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    // FIX 8 (NoSQL operator injection): credentials must be strings so an
    // object like {"$regex":"^a"} never reaches the Mongoose filter.
    if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const admin = await Admin.findOne({ email });

    // FIX 5.3: same response for unknown account and wrong password, so the
    // endpoint no longer leaks which admin emails exist.
    const isMatch = admin ? await admin.comparePassword(password) : false;
    if (!admin || !isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      { adminId: admin._id, role: admin.role, type: "admin" }, // FIX 5.2
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      admin: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get admin details (protected route)
export const getProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.adminId).select("-password");

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    res.status(200).json({
      success: true,
      admin: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("Error fetching admin details:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};