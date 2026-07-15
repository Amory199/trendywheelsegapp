import {
  vehicleFiltersSchema,
  createVehicleSchema,
  updateVehicleSchema,
  vehicleStatusChangeSchema,
  idParamSchema,
} from "@trendywheels/validators";
import { Router, type Router as RouterType } from "express";

import { authenticate, authorize } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";

import * as vehicleController from "./controller.js";

const router: RouterType = Router();

router.get("/", validate({ query: vehicleFiltersSchema }), vehicleController.list);
router.get("/:id", validate({ params: idParamSchema }), vehicleController.getById);
// Public rental availability for the booking calendar: weekday pattern + admin
// blackout dates + fully-booked dates. No auth (customers browse before signing in).
router.get(
  "/:id/availability",
  validate({ params: idParamSchema }),
  vehicleController.availability,
);
router.post(
  "/",
  authenticate,
  authorize("admin"),
  validate({ body: createVehicleSchema }),
  vehicleController.create,
);
router.put(
  "/:id",
  authenticate,
  authorize("admin"),
  validate({ params: idParamSchema, body: updateVehicleSchema }),
  vehicleController.update,
);
router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  validate({ params: idParamSchema }),
  vehicleController.remove,
);

// Sales agents (staff) flip inventory status from mobile without the admin web.
router.patch(
  "/:id/status",
  authenticate,
  authorize("admin", "staff"),
  validate({ params: idParamSchema, body: vehicleStatusChangeSchema }),
  vehicleController.setStatus,
);

export { router as vehicleRoutes };
