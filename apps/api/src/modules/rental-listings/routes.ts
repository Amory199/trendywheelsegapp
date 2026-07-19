import { Router, type Router as RouterType } from "express";

import { authenticate, authorize } from "../../middleware/auth.js";

import * as controller from "./controller.js";

const router: RouterType = Router();

router.post("/", authenticate, controller.submit);
router.get("/", authenticate, controller.listMine);
// Staff approve/reject was explicitly enabled by the owner — the whole team
// triages incoming rental listings, so the directory is no longer admin-only.
router.get("/admin/all", authenticate, authorize("admin", "staff"), controller.listAll);
router.get("/:id", authenticate, controller.getById);
router.patch("/:id", authenticate, controller.update);
router.delete("/:id", authenticate, controller.remove);

export { router as rentalListingRoutes };
