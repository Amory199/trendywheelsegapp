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

export { router as notificationRoutes };
