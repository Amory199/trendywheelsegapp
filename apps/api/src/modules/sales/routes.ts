import {
  createSalesListingSchema,
  idParamSchema,
  paginationSchema,
  updateSalesListingSchema,
} from "@trendywheels/validators";
import { Router, type Router as RouterType } from "express";

import { authenticate } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";

import * as salesController from "./controller.js";

const router: RouterType = Router();

router.get("/", validate({ query: paginationSchema }), salesController.list);
router.get("/:id", validate({ params: idParamSchema }), salesController.getById);
router.post(
  "/",
  authenticate,
  validate({ body: createSalesListingSchema }),
  salesController.create,
);
router.put(
  "/:id",
  authenticate,
  validate({ params: idParamSchema, body: updateSalesListingSchema }),
  salesController.update,
);
router.delete(
  "/:id",
  authenticate,
  validate({ params: idParamSchema }),
  salesController.remove,
);
router.post(
  "/:id/mark-sold",
  authenticate,
  validate({ params: idParamSchema }),
  salesController.markSold,
);
router.post(
  "/:id/take-down",
  authenticate,
  validate({ params: idParamSchema }),
  salesController.takeDown,
);
router.post(
  "/:id/restore",
  authenticate,
  validate({ params: idParamSchema }),
  salesController.restore,
);

export { router as salesRoutes };
