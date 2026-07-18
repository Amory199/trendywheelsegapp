import {
  sendOtpSchema,
  verifyOtpSchema,
  refreshTokenSchema,
  staffLoginSchema,
  setCredentialsSchema,
  assumeRoleSchema,
  otpRequestSchema,
} from "@trendywheels/validators";
import { Router, type Router as RouterType } from "express";
import rateLimit from "express-rate-limit";

import { authenticate, authorize } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";

import { akedlyWebhook } from "./akedly-webhook.js";
import * as authController from "./controller.js";

const router: RouterType = Router();

// Only the CREATE path is limited (keyed on phone) — the poll GET below is hit
// every few seconds by the waiting device and must stay open.
const manualOtpRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 6,
  standardHeaders: true,
  legacyHeaders: false,
  // The checked-in smoke test exercises this path each deploy — don't let its
  // repeated runs trip the limiter (mirrors the global limiter's smoke skip).
  skip: (req) => {
    const ua = req.headers["user-agent"];
    return typeof ua === "string" && ua.startsWith("tw-smoke-test");
  },
  keyGenerator: (req) => {
    const phone = (req.body as { phone?: string } | undefined)?.phone;
    return phone ? `otp-req:${phone}` : `otp-req-ip:${req.ip}`;
  },
  message: {
    message: "Too many requests. Please wait before trying again.",
    code: "RATE_LIMIT_OTP_REQUEST",
    statusCode: 429,
  },
});

router.post("/send-otp", validate({ body: sendOtpSchema }), authController.sendOtp);
// Admin-only manual OTP: issue a login code for a user who can't get a Firebase
// SMS. Returns the code to the admin, who relays it to the user out-of-band.
router.post(
  "/issue-otp",
  authenticate,
  authorize("admin"),
  validate({ body: sendOtpSchema }),
  authController.adminIssueOtp,
);
// ── Manual-OTP request lifecycle (in-app delivery) ──
// Customer requests a manual code (public). Admin issues it. Device polls.
router.post(
  "/otp-request",
  manualOtpRequestLimiter,
  validate({ body: otpRequestSchema }),
  authController.requestManualOtp,
);
router.get("/otp-request/:id", authController.getManualOtp);
router.get("/otp-requests", authenticate, authorize("admin"), authController.listManualOtpRequests);
router.post(
  "/otp-request/:id/issue",
  authenticate,
  authorize("admin"),
  authController.issueManualOtp,
);

router.post("/login-method", validate({ body: sendOtpSchema }), authController.loginMethod);
router.post("/verify-otp", validate({ body: verifyOtpSchema }), authController.verifyOtp);
router.post("/firebase-token", authController.firebaseToken);
router.post("/login", validate({ body: staffLoginSchema }), authController.login);
router.post(
  "/set-credentials",
  authenticate,
  validate({ body: setCredentialsSchema }),
  authController.setCredentials,
);
router.post(
  "/assume-role",
  authenticate,
  authorize("admin"),
  validate({ body: assumeRoleSchema }),
  authController.assumeRole,
);
router.post("/refresh-token", validate({ body: refreshTokenSchema }), authController.refreshToken);
router.post("/logout", authenticate, authController.logout);

// Akedly delivery callback. Unauthenticated by design — the caller is Akedly,
// not a user — but every request must carry a valid svix HMAC signature, and
// the route hard-refuses (503) until AKEDLY_WEBHOOK_SECRET is configured.
router.post("/akedly/webhook", akedlyWebhook);

export { router as authRoutes };
