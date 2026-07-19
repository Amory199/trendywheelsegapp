import { idParamSchema } from "@trendywheels/validators";
import { Router, type Router as RouterType } from "express";

import { authenticate, authorize } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";

import * as controller from "./controller.js";

const router: RouterType = Router();

router.post("/", authenticate, controller.create);
router.get("/", authenticate, controller.listMine);

// Staff approve/reject was explicitly enabled by the owner — sales agents also
// fulfil orders, so the whole team needs the board and the transitions.
const staffOnly = authorize("admin", "staff");

// Staff — must precede /:id so the literal path isn't shadowed by the UUID matcher.
router.get("/admin/all", authenticate, staffOnly, controller.listAll);

router.get("/:id", authenticate, controller.getById);
router.post("/:id/status", authenticate, staffOnly, controller.setStatus);

// Fulfilment pipeline: advance a stage, or read the timeline (staff or the
// order's own customer — the handler enforces the owner case). The id is
// validated here so a malformed one is a 400, not a Prisma P2023 → 500.
router.post(
  "/:id/stage",
  authenticate,
  staffOnly,
  validate({ params: idParamSchema }),
  controller.advanceStage,
);
router.get(
  "/:id/stage-events",
  authenticate,
  validate({ params: idParamSchema }),
  controller.stageEvents,
);

export { router as orderRoutes };
