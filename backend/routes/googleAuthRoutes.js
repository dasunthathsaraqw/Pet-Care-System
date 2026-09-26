import express from "express";
import rateLimit from "express-rate-limit";
import {
  exchangeGoogleLoginCode,
  handleGoogleCallback,
  startGoogleLogin,
} from "../controllers/googleAuthController.js";

const router = express.Router();
const oidcLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

router.get("/google/start", oidcLimiter, startGoogleLogin);
router.get("/google/callback", oidcLimiter, handleGoogleCallback);
router.post("/google/exchange", oidcLimiter, exchangeGoogleLoginCode);

export default router;
