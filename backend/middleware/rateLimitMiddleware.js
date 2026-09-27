import rateLimit from "express-rate-limit";

// FIX 5.3: Rate limiter for user login endpoint (10 requests per 15 minutes)
export const userLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many login attempts. Try again later." },
});

// FIX 5.3: Rate limiter for admin login endpoint (10 requests per 15 minutes)
export const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many login attempts. Try again later." },
});
