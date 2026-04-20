import { sendOtpSchema, verifyOtpSchema, refreshTokenSchema } from "@trendywheels/validators";
import { Router, type Router as RouterType } from "express";

import { authenticate } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";

import * as authController from "./controller.js";

const router: RouterType = Router();

router.post("/send-otp", validate({ body: sendOtpSchema }), authController.sendOtp);
router.post("/verify-otp", validate({ body: verifyOtpSchema }), authController.verifyOtp);
router.post("/refresh-token", validate({ body: refreshTokenSchema }), authController.refreshToken);
router.post("/logout", authenticate, authController.logout);

export { router as authRoutes };
