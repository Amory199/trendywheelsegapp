import {
  sendOtpSchema,
  verifyOtpSchema,
  refreshTokenSchema,
  staffLoginSchema,
  setCredentialsSchema,
  assumeRoleSchema,
} from "@trendywheels/validators";
import { Router, type Router as RouterType } from "express";

import { authenticate, authorize } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";

import * as authController from "./controller.js";

const router: RouterType = Router();

router.post("/send-otp", validate({ body: sendOtpSchema }), authController.sendOtp);
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

export { router as authRoutes };
