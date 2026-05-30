import { idParamSchema, updateUserSchema } from "@trendywheels/validators";
import { Router, type Router as RouterType } from "express";
import rateLimit from "express-rate-limit";

import { authenticate, authorize } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";

import * as userController from "./controller.js";

const router: RouterType = Router();

// Public — backs the /account/delete web form (Google Play Store requires a
// self-service deletion path reachable without app login).
router.post("/request-deletion", userController.requestDeletion);

// Preferences PATCH gets its own modest limiter — legitimate clients PATCH at
// most a few times per session (toggle a tour, change a notification pref),
// so 30 / 5min is generous while still bounding abuse.
const preferencesLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many preference updates", code: "RATE_LIMIT_PREFS", statusCode: 429 },
});
router.patch(
  "/me/preferences",
  authenticate,
  preferencesLimiter,
  userController.updateMyPreferences,
);

router.get("/", authenticate, authorize("admin", "staff"), userController.list);
router.post("/", authenticate, authorize("admin"), userController.createStaff);
router.get("/me", authenticate, userController.getMe);
router.get("/:id", authenticate, validate({ params: idParamSchema }), userController.getById);
router.put(
  "/:id",
  authenticate,
  validate({ params: idParamSchema, body: updateUserSchema }),
  userController.update,
);
router.get(
  "/:id/interactions",
  authenticate,
  validate({ params: idParamSchema }),
  userController.getInteractions,
);
router.get(
  "/:id/timeline",
  authenticate,
  authorize("admin", "staff"),
  validate({ params: idParamSchema }),
  userController.getTimeline,
);
router.get(
  "/:id/export",
  authenticate,
  validate({ params: idParamSchema }),
  userController.exportData,
);
router.delete(
  "/:id",
  authenticate,
  validate({ params: idParamSchema }),
  userController.deleteAccount,
);
router.post(
  "/:id/disable",
  authenticate,
  authorize("admin", "staff"),
  validate({ params: idParamSchema }),
  userController.disable,
);
router.post(
  "/:id/enable",
  authenticate,
  authorize("admin", "staff"),
  validate({ params: idParamSchema }),
  userController.enable,
);

export { router as userRoutes };
