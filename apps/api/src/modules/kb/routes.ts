import { Router, type Router as RouterType } from "express";

import { authenticate, authorize } from "../../middleware/auth.js";

import * as kbController from "./controller.js";

const router: RouterType = Router();

router.get("/search", authenticate, kbController.search);
router.get("/", authenticate, kbController.list);
router.get("/:id", authenticate, kbController.getById);
router.post("/", authenticate, authorize("admin", "staff"), kbController.create);
router.put("/:id", authenticate, authorize("admin", "staff"), kbController.update);
router.delete("/:id", authenticate, authorize("admin", "staff"), kbController.remove);
router.put("/:id/rate", authenticate, kbController.rate);

export { router as kbRoutes };
