import {
  createRepairRequestSchema,
  idParamSchema,
  paginationSchema,
  updateRepairRequestSchema,
} from "@trendywheels/validators";
import { Router, type Router as RouterType } from "express";

import { authenticate } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";

import * as repairsController from "./controller.js";

const router: RouterType = Router();

router.get("/", authenticate, validate({ query: paginationSchema }), repairsController.list);
router.post(
  "/",
  authenticate,
  validate({ body: createRepairRequestSchema }),
  repairsController.create,
);
router.put(
  "/:id",
  authenticate,
  validate({ params: idParamSchema, body: updateRepairRequestSchema }),
  repairsController.update,
);

export { router as repairRoutes };
