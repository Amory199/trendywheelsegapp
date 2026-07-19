import { Router, type Router as RouterType } from "express";

import { authenticate, authorize } from "../../middleware/auth.js";

import * as controller from "./controller.js";

const router: RouterType = Router();

router.post("/", authenticate, controller.create);
router.get("/", authenticate, controller.list);
// Staff approve/reject was explicitly enabled by the owner — sales agents work
// reservations too, so status transitions are no longer admin-only.
router.patch("/:id", authenticate, authorize("admin", "staff"), controller.update);

export { router as reservationRoutes };
