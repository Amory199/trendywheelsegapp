import { Router, type Router as RouterType } from "express";

import { authenticate, authorize } from "../../middleware/auth.js";

import * as controller from "./controller.js";

const router: RouterType = Router();

// Invoices are an admin/staff tool — only privileged accounts generate or list.
router.post("/", authenticate, authorize("admin", "staff"), controller.create);
router.get("/", authenticate, authorize("admin", "staff"), controller.list);
router.get("/:id/pdf", authenticate, authorize("admin", "staff"), controller.pdf);

export { router as invoiceRoutes };
