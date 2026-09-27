// middleware/professionalAuth.js
import jwt from "jsonwebtoken";
import Professional from "../models/professionalModel.js";

export const authenticateProfessional = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== "professional") { // FIX 5.2
      return res.status(401).json({ message: "Invalid or expired token" }); // FIX 5.2
    } // FIX 5.2
    req.professional = decoded; // decoded contains { id: professional._id }
    // Fetch pID from the database using the decoded ID
    Professional.findById(decoded.id)
      .then((professional) => {
        if (!professional) {
          return res.status(401).json({ message: "Professional not found" });
        }
        req.professional.pID = professional.pID;
        next();
      })
      .catch(() => res.status(401).json({ message: "Invalid token" }));
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};