import { sendMessageSchema } from "@trendywheels/validators";
import { Router, type Router as RouterType } from "express";

import { authenticate } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";

import * as messagesController from "./controller.js";

const router: RouterType = Router();

router.get("/conversations", authenticate, messagesController.listConversations);
router.get("/conversations/:conversationId/messages", authenticate, messagesController.listMessages);
router.post(
  "/conversations/:conversationId/read",
  authenticate,
  messagesController.markRead,
);
router.post("/", authenticate, validate({ body: sendMessageSchema }), messagesController.send);

export { router as messageRoutes };
