import crypto from "crypto";
import jwt from "jsonwebtoken";
import * as oidc from "openid-client";
import User from "../models/User.js";
import OidcLoginCode from "../models/OidcLoginCode.js";

const GOOGLE_ISSUER = new URL("https://accounts.google.com");
const TRANSACTION_COOKIE = "google_oidc_transaction";
const TRANSACTION_TTL_MS = 10 * 60 * 1000;
const LOGIN_CODE_TTL_MS = 60 * 1000;

let oidcConfigurationPromise;

const requiredOidcEnvironment = () => [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REDIRECT_URI",
  "FRONTEND_URL",
  "SESSION_SECRET",
];

const hasOidcConfiguration = () =>
  requiredOidcEnvironment().every((name) => Boolean(process.env[name]?.trim()));

const getOidcConfiguration = () => {
  if (!oidcConfigurationPromise) {
    oidcConfigurationPromise = oidc.discovery(
      GOOGLE_ISSUER,
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
  }

  return oidcConfigurationPromise;
};

const transactionCookieBaseOptions = () => ({
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/api/auth/google/callback",
});

const transactionCookieOptions = () => ({
  ...transactionCookieBaseOptions(),
  maxAge: TRANSACTION_TTL_MS,
});

const readCookie = (req, name) => {
  const cookies = req.headers.cookie?.split(";") || [];
  for (const cookie of cookies) {
    const separator = cookie.indexOf("=");
    if (separator === -1) continue;
    const cookieName = cookie.slice(0, separator).trim();
    if (cookieName === name) {
      return decodeURIComponent(cookie.slice(separator + 1).trim());
    }
  }
  return null;
};

const createApplicationToken = (user) =>
  jwt.sign(
    { userId: user._id, name: user.name, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

const hashLoginCode = (code) =>
  crypto.createHash("sha256").update(code).digest("hex");

const escapeRegularExpression = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const frontendErrorRedirect = (res, errorCode) => {
  const frontendUrl = new URL("/login", process.env.FRONTEND_URL);
  frontendUrl.searchParams.set("oauth_error", errorCode);
  return res.redirect(frontendUrl.href);
};

export const startGoogleLogin = async (req, res) => {
  if (!hasOidcConfiguration()) {
    return res.status(503).json({ message: "Google login is not configured" });
  }

  try {
    const configuration = await getOidcConfiguration();
    const state = oidc.randomState();
    const nonce = oidc.randomNonce();
    const codeVerifier = oidc.randomPKCECodeVerifier();
    const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);
    const transaction = jwt.sign(
      { state, nonce, codeVerifier },
      process.env.SESSION_SECRET,
      {
        expiresIn: "10m",
        issuer: "pet-care-system",
        audience: "google-oidc-transaction",
      }
    );

    res.cookie(TRANSACTION_COOKIE, transaction, transactionCookieOptions());

    const authorizationUrl = oidc.buildAuthorizationUrl(configuration, {
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      scope: "openid email profile",
      response_type: "code",
      state,
      nonce,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    return res.redirect(authorizationUrl.href);
  } catch (error) {
    console.error("Unable to start Google login:", error.message);
    return res.status(502).json({ message: "Unable to start Google login" });
  }
};

export const handleGoogleCallback = async (req, res) => {
  if (!hasOidcConfiguration()) {
    return res.status(503).json({ message: "Google login is not configured" });
  }

  const transactionToken = readCookie(req, TRANSACTION_COOKIE);
  res.clearCookie(TRANSACTION_COOKIE, transactionCookieBaseOptions());

  if (req.query.error) {
    return frontendErrorRedirect(res, "authorization_cancelled");
  }

  if (!transactionToken) {
    return frontendErrorRedirect(res, "invalid_transaction");
  }

  try {
    const transaction = jwt.verify(
      transactionToken,
      process.env.SESSION_SECRET,
      {
        issuer: "pet-care-system",
        audience: "google-oidc-transaction",
      }
    );
    const configuration = await getOidcConfiguration();
    const callbackUrl = new URL(process.env.GOOGLE_REDIRECT_URI);
    for (const [name, value] of Object.entries(req.query)) {
      if (typeof value === "string") callbackUrl.searchParams.set(name, value);
    }

    const tokens = await oidc.authorizationCodeGrant(
      configuration,
      callbackUrl,
      {
        pkceCodeVerifier: transaction.codeVerifier,
        expectedState: transaction.state,
        expectedNonce: transaction.nonce,
        idTokenExpected: true,
      }
    );
    const claims = tokens.claims();

    if (!claims?.sub || !claims.email || claims.email_verified !== true) {
      return frontendErrorRedirect(res, "unverified_email");
    }

    const normalizedEmail = claims.email.trim().toLowerCase();
    let user = await User.findOne({ googleSub: claims.sub });
    if (!user) {
      const existingEmailUser = await User.findOne({
        email: {
          $regex: `^${escapeRegularExpression(normalizedEmail)}$`,
          $options: "i",
        },
      });
      if (existingEmailUser) {
        return frontendErrorRedirect(res, "account_link_required");
      }

      user = await User.create({
        name: claims.name || normalizedEmail.split("@")[0],
        email: normalizedEmail,
        googleSub: claims.sub,
        googleEmailVerified: true,
        profilePicture: claims.picture || "",
      });
    }

    const loginCode = crypto.randomBytes(32).toString("base64url");
    await OidcLoginCode.create({
      codeHash: hashLoginCode(loginCode),
      userId: user._id,
      expiresAt: new Date(Date.now() + LOGIN_CODE_TTL_MS),
    });

    const frontendCallback = new URL("/oauth/callback", process.env.FRONTEND_URL);
    frontendCallback.hash = new URLSearchParams({ code: loginCode }).toString();
    return res.redirect(frontendCallback.href);
  } catch (error) {
    console.error("Google login callback failed:", error.message);
    return frontendErrorRedirect(res, "authentication_failed");
  }
};

export const exchangeGoogleLoginCode = async (req, res) => {
  const { code } = req.body;
  if (typeof code !== "string" || code.length < 32 || code.length > 256) {
    return res.status(400).json({ message: "Invalid login code" });
  }

  try {
    const loginCode = await OidcLoginCode.findOneAndUpdate(
      {
        codeHash: hashLoginCode(code),
        usedAt: null,
        expiresAt: { $gt: new Date() },
      },
      { $set: { usedAt: new Date() } },
      { new: true }
    );

    if (!loginCode) {
      return res.status(400).json({ message: "Login code is invalid or expired" });
    }

    const user = await User.findById(loginCode.userId);
    if (!user?.googleSub) {
      return res.status(403).json({ message: "Google pet-owner account not found" });
    }

    return res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber || "",
      city: user.city || "",
      profilePicture: user.profilePicture || "",
      role: "pet_owner",
      token: createApplicationToken(user),
    });
  } catch (error) {
    console.error("Google login code exchange failed:", error.message);
    return res.status(500).json({ message: "Unable to complete Google login" });
  }
};
