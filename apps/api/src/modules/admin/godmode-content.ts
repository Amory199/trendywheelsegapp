// Marketing/content management endpoints split out of the original
// godmode.ts: promo codes, pricing rules, notification templates,
// broadcasts, canned replies. Mounted by godmode.ts so the public URL
// surface stays unchanged.

import { Router, type Router as RouterType } from "express";

import {
  broadcastSchema,
  cannedReplySchema,
  notificationTemplateSchema,
  pricingRuleSchema,
  promoCodeSchema,
} from "@trendywheels/validators";

import { prisma } from "../../config/database.js";
import { AppError } from "../../utils/errors.js";
import { notifyUser } from "../../utils/notify.js";

import { writeAudit } from "./audit.js";

const router: RouterType = Router();

// ─── Promo codes ─────────────────────────────────────────────
router.get("/promo-codes", async (_req, res) => {
  const list = await prisma.promoCode.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { redemptions: true } } },
  });
  res.json({ data: list });
});

router.post("/promo-codes", async (req, res) => {
  const body = promoCodeSchema.parse(req.body);
  const created = await prisma.promoCode.create({
    data: { ...body, expiresAt: body.expiresAt ? new Date(body.expiresAt) : null },
  });
  await writeAudit(req.user!.userId, null, "promo.create", "promo_code", created.id, body);
  res.status(201).json({ data: created });
});

router.patch("/promo-codes/:id", async (req, res) => {
  const body = promoCodeSchema.partial().parse(req.body);
  const updated = await prisma.promoCode.update({
    where: { id: req.params.id },
    data: { ...body, expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined },
  });
  await writeAudit(req.user!.userId, null, "promo.update", "promo_code", updated.id, body);
  res.json({ data: updated });
});

router.delete("/promo-codes/:id", async (req, res) => {
  await prisma.promoCode.delete({ where: { id: req.params.id } });
  await writeAudit(req.user!.userId, null, "promo.delete", "promo_code", req.params.id, null);
  res.json({ success: true });
});

// ─── Pricing rules ───────────────────────────────────────────
router.get("/pricing-rules", async (_req, res) => {
  const list = await prisma.pricingRule.findMany({ orderBy: { createdAt: "desc" } });
  res.json({ data: list });
});

router.post("/pricing-rules", async (req, res) => {
  const body = pricingRuleSchema.parse(req.body);
  const created = await prisma.pricingRule.create({
    data: { ...body, dateRanges: body.dateRanges as never },
  });
  await writeAudit(req.user!.userId, null, "pricing.create", "pricing_rule", created.id, body);
  res.status(201).json({ data: created });
});

router.patch("/pricing-rules/:id", async (req, res) => {
  const body = pricingRuleSchema.partial().parse(req.body);
  const updated = await prisma.pricingRule.update({
    where: { id: req.params.id },
    data: { ...body, dateRanges: body.dateRanges as never | undefined },
  });
  await writeAudit(req.user!.userId, null, "pricing.update", "pricing_rule", updated.id, body);
  res.json({ data: updated });
});

router.delete("/pricing-rules/:id", async (req, res) => {
  await prisma.pricingRule.delete({ where: { id: req.params.id } });
  await writeAudit(req.user!.userId, null, "pricing.delete", "pricing_rule", req.params.id, null);
  res.json({ success: true });
});

// ─── Notification templates ──────────────────────────────────
router.get("/templates", async (_req, res) => {
  const list = await prisma.notificationTemplate.findMany({ orderBy: { key: "asc" } });
  res.json({ data: list });
});

router.post("/templates", async (req, res) => {
  const body = notificationTemplateSchema.parse(req.body);
  const created = await prisma.notificationTemplate.create({
    data: { ...body, variables: body.variables as never },
  });
  await writeAudit(
    req.user!.userId,
    null,
    "template.create",
    "notification_template",
    created.id,
    body,
  );
  res.status(201).json({ data: created });
});

router.patch("/templates/:id", async (req, res) => {
  const body = notificationTemplateSchema.partial().parse(req.body);
  const updated = await prisma.notificationTemplate.update({
    where: { id: req.params.id },
    data: { ...body, variables: body.variables as never | undefined },
  });
  await writeAudit(
    req.user!.userId,
    null,
    "template.update",
    "notification_template",
    updated.id,
    body,
  );
  res.json({ data: updated });
});

router.delete("/templates/:id", async (req, res) => {
  await prisma.notificationTemplate.delete({ where: { id: req.params.id } });
  await writeAudit(
    req.user!.userId,
    null,
    "template.delete",
    "notification_template",
    req.params.id,
    null,
  );
  res.json({ success: true });
});

// ─── Broadcasts ──────────────────────────────────────────────
router.get("/broadcasts", async (_req, res) => {
  const list = await prisma.broadcast.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  res.json({ data: list });
});

router.post("/broadcasts", async (req, res) => {
  const body = broadcastSchema.parse(req.body);
  const userId = req.user!.userId;
  const created = await prisma.broadcast.create({
    data: {
      title: body.title,
      bodyMd: body.bodyMd,
      audience: body.audience,
      channels: body.channels,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
      createdById: userId,
    },
  });
  await writeAudit(userId, null, "broadcast.create", "broadcast", created.id, body);
  res.status(201).json({ data: created });
});

router.post("/broadcasts/:id/send-now", async (req, res) => {
  const broadcast = await prisma.broadcast.findUnique({ where: { id: req.params.id } });
  if (!broadcast) throw AppError.notFound("Broadcast not found");
  if (broadcast.sentAt) throw AppError.badRequest("Already sent");

  // Resolve audience → user IDs
  const where: Record<string, unknown> = { status: "active" };
  if (broadcast.audience === "customers") where.accountType = "customer";
  else if (broadcast.audience === "staff") where.accountType = { in: ["admin", "staff"] };
  else if (broadcast.audience.startsWith("tier:"))
    where.loyaltyTier = broadcast.audience.split(":")[1];
  // "all" = no filter

  const users = await prisma.user.findMany({ where, select: { id: true } });
  await Promise.all(
    users.map((u) =>
      notifyUser(u.id, `broadcast-${broadcast.id}`, {
        type: "broadcast",
        title: broadcast.title,
        body: broadcast.bodyMd,
        data: { broadcastId: broadcast.id },
      }),
    ),
  );

  await prisma.broadcast.update({
    where: { id: broadcast.id },
    data: { sentAt: new Date(), sentCount: users.length },
  });
  await writeAudit(req.user!.userId, null, "broadcast.send", "broadcast", broadcast.id, {
    count: users.length,
  });
  res.json({ success: true, sentCount: users.length });
});

router.delete("/broadcasts/:id", async (req, res) => {
  await prisma.broadcast.delete({ where: { id: req.params.id } });
  await writeAudit(req.user!.userId, null, "broadcast.delete", "broadcast", req.params.id, null);
  res.json({ success: true });
});

// ─── Canned replies ──────────────────────────────────────────
router.get("/canned-replies", async (_req, res) => {
  const list = await prisma.cannedReply.findMany({ orderBy: { label: "asc" } });
  res.json({ data: list });
});

router.post("/canned-replies", async (req, res) => {
  const body = cannedReplySchema.parse(req.body);
  const created = await prisma.cannedReply.create({
    data: { ...body, createdById: req.user!.userId },
  });
  res.status(201).json({ data: created });
});

router.patch("/canned-replies/:id", async (req, res) => {
  const body = cannedReplySchema.partial().parse(req.body);
  const updated = await prisma.cannedReply.update({ where: { id: req.params.id }, data: body });
  res.json({ data: updated });
});

router.delete("/canned-replies/:id", async (req, res) => {
  await prisma.cannedReply.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

export { router as godModeContentRoutes };
