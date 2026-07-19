import { Router, type Router as RouterType } from "express";

import { authenticate, authorize } from "../../middleware/auth.js";

import * as controller from "./controller.js";

const router: RouterType = Router();

router.post("/", authenticate, controller.submit);
router.get("/", authenticate, controller.listMine);
router.get("/:id", authenticate, controller.getById);

// Admin
router.get("/admin/all", authenticate, authorize("admin"), controller.listAll);
// Staff approve/reject was explicitly enabled by the owner — sales agents price
// trade-ins as part of closing a sale.
router.post("/:id/quote", authenticate, authorize("admin", "staff"), controller.quote);

export { router as tradeInRoutes };
