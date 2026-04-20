import {
  vehicleFiltersSchema,
  createVehicleSchema,
  updateVehicleSchema,
  idParamSchema,
} from "@trendywheels/validators";
import { Router } from "express";

import { authenticate, authorize } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";

import * as vehicleController from "./controller.js";

const router = Router();

router.get("/", validate({ query: vehicleFiltersSchema }), vehicleController.list);
router.get("/:id", validate({ params: idParamSchema }), vehicleController.getById);
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

export { router as vehicleRoutes };
