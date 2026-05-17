import type { Request, Response } from "express";
import { Router, type Router as RouterType } from "express";

import { prisma } from "../../config/database.js";
import { authenticate } from "../../middleware/auth.js";

const router: RouterType = Router();

router.get("/", authenticate, async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const data = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  res.json({ data });
});

router.post("/:id/read", authenticate, async (req: Request, res: Response) => {
  await prisma.notification.updateMany({
    where: { id: req.params.id, userId: req.user!.userId },
    data: { readAt: new Date() },
  });
  res.json({ success: true });
});

router.post("/read-all", authenticate, async (req: Request, res: Response) => {
  await prisma.notification.updateMany({
    where: { userId: req.user!.userId, readAt: null },
    data: { readAt: new Date() },
  });
  res.json({ success: true });
});

// Register an Expo push token for the authenticated user.
router.post("/push-tokens", authenticate, async (req: Request, res: Response) => {
  const { token, platform } = req.body as { token?: string; platform?: string };
  if (!token || typeof token !== "string" || token.length < 8) {
    res.status(400).json({ error: { message: "Invalid token" } });
    return;
  }
  await prisma.pushToken.upsert({
    where: { token },
    create: {
      token,
      platform: platform === "ios" || platform === "android" ? platform : "unknown",
      userId: req.user!.userId,
    },
    update: { userId: req.user!.userId, lastSeenAt: new Date() },
  });
  res.json({ success: true });
});

router.delete("/push-tokens/:token", authenticate, async (req: Request, res: Response) => {
  await prisma.pushToken.deleteMany({
    where: { token: req.params.token, userId: req.user!.userId },
  });
  res.json({ success: true });
});

export { router as notificationRoutes };
