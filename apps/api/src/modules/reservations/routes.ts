import { Router, type Router as RouterType } from "express";

import { authenticate, authorize } from "../../middleware/auth.js";

import * as controller from "./controller.js";

const router: RouterType = Router();

router.post("/", authenticate, controller.create);
router.get("/", authenticate, controller.list);
router.patch("/:id", authenticate, authorize("admin"), controller.update);

export { router as reservationRoutes };
