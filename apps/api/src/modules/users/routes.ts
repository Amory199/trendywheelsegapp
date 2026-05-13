import { idParamSchema, updateUserSchema } from "@trendywheels/validators";
import { Router, type Router as RouterType } from "express";

import { authenticate, authorize } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";

import * as userController from "./controller.js";

const router: RouterType = Router();

// Public — backs the /account/delete web form (Google Play Store requires a
// self-service deletion path reachable without app login).
router.post("/request-deletion", userController.requestDeletion);

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
