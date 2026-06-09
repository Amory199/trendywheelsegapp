import { Router, type Router as RouterType } from "express";

import { authenticate, authorize } from "../../middleware/auth.js";

import * as controller from "./controller.js";

const router: RouterType = Router();

router.post("/", authenticate, controller.create);
router.get("/", authenticate, controller.listMine);

// Admin — must precede /:id so the literal path isn't shadowed by the UUID matcher.
router.get("/admin/all", authenticate, authorize("admin"), controller.listAll);

router.get("/:id", authenticate, controller.getById);
router.post("/:id/status", authenticate, authorize("admin"), controller.setStatus);

export { router as orderRoutes };
