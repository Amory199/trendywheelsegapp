import { Router, type Router as RouterType } from "express";

import { authenticate, authorize } from "../../middleware/auth.js";

import * as controller from "./controller.js";

const router: RouterType = Router();

router.post("/", authenticate, controller.submit);
router.get("/", authenticate, controller.listMine);
router.get("/admin/all", authenticate, authorize("admin"), controller.listAll);
router.get("/:id", authenticate, controller.getById);
router.patch("/:id", authenticate, controller.update);
router.delete("/:id", authenticate, controller.remove);

export { router as rentalListingRoutes };
