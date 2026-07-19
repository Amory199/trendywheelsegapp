import {
  advanceStageSchema,
  bookingFiltersSchema,
  checkInBookingSchema,
  createBookingSchema,
  updateBookingSchema,
  idParamSchema,
} from "@trendywheels/validators";
import { Router, type Router as RouterType } from "express";

import { authenticate, authorize } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";

import * as bookingController from "./controller.js";

const router: RouterType = Router();

// Staff-only booking lifecycle (payments + approvals). Handlers already block
// customers; gating at the route too makes the rule visible and refactor-proof
// (RBAC Phase 1).
const staffOnly = authorize("admin", "staff");

router.get("/", authenticate, validate({ query: bookingFiltersSchema }), bookingController.list);
router.post("/", authenticate, validate({ body: createBookingSchema }), bookingController.create);
// Single booking (staff or owner) — backs the QR check-in lookup.
router.get("/:id", authenticate, validate({ params: idParamSchema }), bookingController.getOne);
// Handover / pickup: scan the pass (or confirm by code) → stamp check-in.
router.post(
  "/:id/check-in",
  authenticate,
  staffOnly,
  validate({ params: idParamSchema, body: checkInBookingSchema }),
  bookingController.checkIn,
);
router.put(
  "/:id",
  authenticate,
  validate({ params: idParamSchema, body: updateBookingSchema }),
  bookingController.update,
);
router.delete("/:id", authenticate, validate({ params: idParamSchema }), bookingController.remove);
router.post(
  "/:id/cancel",
  authenticate,
  validate({ params: idParamSchema }),
  bookingController.cancel,
);
router.post(
  "/:id/mark-paid",
  authenticate,
  staffOnly,
  validate({ params: idParamSchema }),
  bookingController.markPaid,
);
router.post(
  "/:id/refund",
  authenticate,
  staffOnly,
  validate({ params: idParamSchema }),
  bookingController.refund,
);
router.post(
  "/:id/approve",
  authenticate,
  staffOnly,
  validate({ params: idParamSchema }),
  bookingController.approve,
);
// Staff fulfilment pipeline: advance a stage, or read the timeline (staff or
// the booking's own customer — the handler enforces the owner case).
router.post(
  "/:id/stage",
  authenticate,
  staffOnly,
  validate({ params: idParamSchema, body: advanceStageSchema }),
  bookingController.advanceStage,
);
router.get(
  "/:id/stage-events",
  authenticate,
  validate({ params: idParamSchema }),
  bookingController.stageEvents,
);
router.post(
  "/:id/reject",
  authenticate,
  staffOnly,
  validate({ params: idParamSchema }),
  bookingController.reject,
);

export { router as bookingRoutes };
