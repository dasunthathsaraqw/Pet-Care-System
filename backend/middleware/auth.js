import jwt from 'jsonwebtoken';

const auth = (req, res, next) => {
  // Get token from header
  const token = req.header('Authorization')?.replace('Bearer ', '');

  // Check if no token
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'user') { // FIX 5.2
      return res.status(401).json({ message: 'Invalid or expired token' }); // FIX 5.2
    } // FIX 5.2
    
    // Add user from payload to request
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

export default auth; 