import { Router, type Router as RouterType } from "express";

import { authenticate, authorize } from "../../middleware/auth.js";

import * as controller from "./controller.js";

const router: RouterType = Router();

// Public catalog (anyone can browse).
router.get("/", controller.list);
router.get("/:id", controller.getById);

// Admin-only mutations.
router.post("/", authenticate, authorize("admin"), controller.create);
router.patch("/:id", authenticate, authorize("admin"), controller.update);
router.delete("/:id", authenticate, authorize("admin"), controller.remove);

export { router as productRoutes };
