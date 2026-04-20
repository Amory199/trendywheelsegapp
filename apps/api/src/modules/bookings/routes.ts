import {
  bookingFiltersSchema,
  createBookingSchema,
  updateBookingSchema,
  idParamSchema,
} from "@trendywheels/validators";
import { Router, type Router as RouterType } from "express";

import { authenticate } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";

import * as bookingController from "./controller.js";

const router: RouterType = Router();

router.get("/", authenticate, validate({ query: bookingFiltersSchema }), bookingController.list);
router.post("/", authenticate, validate({ body: createBookingSchema }), bookingController.create);
router.put(
  "/:id",
  authenticate,
  validate({ params: idParamSchema, body: updateBookingSchema }),
  bookingController.update,
);
router.delete("/:id", authenticate, validate({ params: idParamSchema }), bookingController.remove);

export { router as bookingRoutes };
