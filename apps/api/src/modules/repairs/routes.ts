import {
  createRepairRequestSchema,
  idParamSchema,
  paginationSchema,
  updateRepairRequestSchema,
} from "@trendywheels/validators";
import { Router, type Router as RouterType } from "express";

import { authenticate, authorize } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";

import * as repairsController from "./controller.js";

const router: RouterType = Router();

router.get("/", authenticate, validate({ query: paginationSchema }), repairsController.list);
router.get("/:id", authenticate, validate({ params: idParamSchema }), repairsController.getById);
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

router.post("/:id/start", authenticate, authorize("admin", "staff"), repairsController.start);
router.post("/:id/complete", authenticate, authorize("admin", "staff"), repairsController.complete);
router.post("/:id/cancel", authenticate, repairsController.cancel);
router.delete("/:id", authenticate, authorize("admin"), repairsController.remove);

export { router as repairRoutes };
