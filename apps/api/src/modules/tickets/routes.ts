import {
  createTicketSchema,
  idParamSchema,
  paginationSchema,
  updateTicketSchema,
} from "@trendywheels/validators";
import { Router, type Router as RouterType } from "express";

import { authenticate } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";

import * as ticketsController from "./controller.js";

const router: RouterType = Router();

router.get("/", authenticate, validate({ query: paginationSchema }), ticketsController.list);
router.get("/:id", authenticate, validate({ params: idParamSchema }), ticketsController.getOne);
router.post("/", authenticate, validate({ body: createTicketSchema }), ticketsController.create);
router.put(
  "/:id",
  authenticate,
  validate({ params: idParamSchema, body: updateTicketSchema }),
  ticketsController.update,
);

export { router as ticketRoutes };
