import { contextThreadSchema, sendMessageSchema } from "@trendywheels/validators";
import { Router, type Router as RouterType } from "express";

import { authenticate } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";

import * as messagesController from "./controller.js";

const router: RouterType = Router();

router.get("/conversations", authenticate, messagesController.listConversations);
router.post("/conversations", authenticate, messagesController.createConversation);
// Open (or resume) the shared thread about one booking/reservation/repair.
router.post(
  "/context-thread",
  authenticate,
  validate({ body: contextThreadSchema }),
  messagesController.openContextThread,
);
router.get(
  "/conversations/:conversationId/messages",
  authenticate,
  messagesController.listMessages,
);
router.get("/conversations/:conversationId", authenticate, messagesController.getConversation);
router.post("/conversations/:conversationId/read", authenticate, messagesController.markRead);
router.get("/support-contact", authenticate, messagesController.supportContact);
router.get("/unread-count", authenticate, messagesController.unreadCount);
router.post("/", authenticate, validate({ body: sendMessageSchema }), messagesController.send);

export { router as messageRoutes };
