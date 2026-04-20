import { idParamSchema, updateUserSchema } from "@trendywheels/validators";
import { Router, type Router as RouterType } from "express";

import { authenticate, authorize } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";

import * as userController from "./controller.js";

const router: RouterType = Router();

router.get("/", authenticate, authorize("admin", "staff"), userController.list);
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

export { router as userRoutes };
