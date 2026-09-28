import jwt from "jsonwebtoken";

const auth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) return res.status(401).json({ message: "Authentication required" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== "user") { // FIX 5.2
      return res.status(401).json({ message: "Invalid or expired token" }); // FIX 5.2
    } // FIX 5.2
    req.user = decoded;
    
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
  
};

export default auth;