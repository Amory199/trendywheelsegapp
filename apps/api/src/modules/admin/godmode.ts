import { Router, type Router as RouterType } from "express";
import { z } from "zod";

import { prisma } from "../../config/database.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import {
  alertEvaluatorQueue,
  leadSweeperQueue,
  notificationsQueue,
  remindersQueue,
} from "../../queues/index.js";
import { AppError } from "../../utils/errors.js";
import { signAccessToken } from "../auth/service.js";
import { logger } from "../../utils/logger.js";

const router: RouterType = Router();

router.use(authenticate, authorize("admin"));

const requireAdmin = async (userId: string): Promise<void> => {
  const me = await prisma.user.findUnique({ where: { id: userId } });
  if (!(me?.accountType === "admin" || me?.staffRole === "admin")) {
    throw AppError.forbidden("Admins only");
  }
};

const writeAudit = async (
  userId: string,
  actingAsId: string | null,
  action: string,
  entity: string,
  entityId: string | null,
  diff: unknown,
): Promise<void> => {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        actingAsId: actingAsId ?? null,
        action,
        entity,
        entityId: entityId ?? null,
        diff: diff as never,
      },
    });
  } catch (err) {
    logger.error({ err, action, entity }, "Failed to write audit log");
  }
};

// ─── Operational levers ───────────────────────────────────────
router.post("/ops/run-lead-sweep", async (req, res) => {
  await leadSweeperQueue.add("manual-tick", {}, { removeOnComplete: true });
  await writeAudit(req.user!.userId, null, "ops.run-lead-sweep", "queue", null, null);
  res.json({ success: true, queued: "lead-sweeper" });
});

router.post("/ops/run-alert-eval", async (req, res) => {
  await alertEvaluatorQueue.add("manual-tick", {}, { removeOnComplete: true });
  await writeAudit(req.user!.userId, null, "ops.run-alert-eval", "queue", null, null);
  res.json({ success: true, queued: "alert-evaluator" });
});

router.post("/ops/send-reminder/:bookingId", async (req, res) => {
  const id = req.params.bookingId;
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) throw AppError.notFound("Booking not found");
  await remindersQueue.add(
    `reminder-manual-${id}-${Date.now()}`,
    { bookingId: id },
    { removeOnComplete: true },
  );
  await writeAudit(req.user!.userId, null, "ops.send-reminder", "booking", id, null);
  res.json({ success: true });
});

router.post("/ops/force-assign-lead/:leadId", async (req, res) => {
  const schema = z.object({ ownerId: z.string().uuid() });
  const body = schema.parse(req.body);
  const lead = await prisma.lead.findUnique({ where: { id: req.params.leadId } });
  if (!lead) throw AppError.notFound("Lead not found");
  const previous = lead.ownerId;
  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      ownerId: body.ownerId,
      assignedAt: new Date(),
      claimDeadline: new Date(Date.now() + 30 * 60 * 1000),
      lastActivityAt: new Date(),
      reassignmentCount: { increment: 1 },
    },
  });
  await writeAudit(req.user!.userId, null, "ops.force-assign-lead", "lead", lead.id, {
    from: previous,
    to: body.ownerId,
  });
  res.json({ success: true });
});

router.post("/ops/recalc-loyalty/:userId", async (req, res) => {
  const userId = req.params.userId;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw AppError.notFound("User not found");
  const txns = await prisma.loyaltyTransaction.findMany({ where: { userId } });
  const total = txns.reduce((acc: number, t: { points: number; type: string }) => {
    if (t.type === "earned" || t.type === "manual_adjust") return acc + t.points;
    if (t.type === "redeemed" || t.type === "expired") return acc - Math.abs(t.points);
    return acc;
  }, 0);
  await prisma.user.update({ where: { id: userId }, data: { loyaltyPoints: Math.max(0, total) } });
  await writeAudit(req.user!.userId, null, "ops.recalc-loyalty", "user", userId, {
    newTotal: total,
  });
  res.json({ success: true, total });
});

// ─── Loyalty manual adjust ───────────────────────────────────
router.post("/users/:id/loyalty-adjust", async (req, res) => {
  const schema = z.object({ points: z.number().int(), reason: z.string().min(1).max(200) });
  const body = schema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) throw AppError.notFound("User not found");
  await prisma.$transaction(async (tx) => {
    await tx.loyaltyTransaction.create({
      data: { userId: user.id, points: body.points, type: "manual_adjust", reason: body.reason },
    });
    await tx.user.update({
      where: { id: user.id },
      data: { loyaltyPoints: { increment: body.points } },
    });
  });
  await writeAudit(req.user!.userId, null, "loyalty.manual-adjust", "user", user.id, body);
  res.json({ success: true });
});

// ─── Partial refund ──────────────────────────────────────────
router.post("/bookings/:id/refund-partial", async (req, res) => {
  const schema = z.object({ amount: z.number().positive(), reason: z.string().min(1).max(300) });
  const body = schema.parse(req.body);
  const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
  if (!booking) throw AppError.notFound("Booking not found");
  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      paymentStatus: "refunded",
      notes: `${booking.notes ?? ""}\n[Refund EGP ${body.amount}] ${body.reason}`.trim(),
    },
  });
  await writeAudit(req.user!.userId, null, "booking.refund-partial", "booking", booking.id, body);
  res.json({ success: true });
});

// ─── Promo codes ─────────────────────────────────────────────
const promoSchema = z.object({
  code: z.string().min(3).max(40).toUpperCase(),
  kind: z.enum(["percent", "fixed"]),
  value: z.number().positive(),
  appliesTo: z.enum(["booking", "sale", "both"]).default("booking"),
  usageLimit: z.number().int().positive().optional(),
  expiresAt: z.string().datetime().optional(),
  active: z.boolean().default(true),
});

router.get("/promo-codes", async (_req, res) => {
  const list = await prisma.promoCode.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { redemptions: true } } },
  });
  res.json({ data: list });
});

router.post("/promo-codes", async (req, res) => {
  const body = promoSchema.parse(req.body);
  const created = await prisma.promoCode.create({
    data: { ...body, expiresAt: body.expiresAt ? new Date(body.expiresAt) : null },
  });
  await writeAudit(req.user!.userId, null, "promo.create", "promo_code", created.id, body);
  res.status(201).json({ data: created });
});

router.patch("/promo-codes/:id", async (req, res) => {
  const body = promoSchema.partial().parse(req.body);
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
const pricingSchema = z.object({
  name: z.string().min(1).max(120),
  kind: z.enum(["weekend", "peak", "holiday", "blackout"]),
  surchargePct: z.number(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).default([]),
  dateRanges: z.array(z.object({ from: z.string(), to: z.string() })).default([]),
  appliesTo: z.enum(["rent", "sell", "both"]).default("rent"),
  active: z.boolean().default(true),
});

router.get("/pricing-rules", async (_req, res) => {
  const list = await prisma.pricingRule.findMany({ orderBy: { createdAt: "desc" } });
  res.json({ data: list });
});

router.post("/pricing-rules", async (req, res) => {
  const body = pricingSchema.parse(req.body);
  const created = await prisma.pricingRule.create({
    data: { ...body, dateRanges: body.dateRanges as never },
  });
  await writeAudit(req.user!.userId, null, "pricing.create", "pricing_rule", created.id, body);
  res.status(201).json({ data: created });
});

router.patch("/pricing-rules/:id", async (req, res) => {
  const body = pricingSchema.partial().parse(req.body);
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
const templateSchema = z.object({
  key: z.string().min(1).max(80),
  channel: z.enum(["push", "email", "sms"]),
  subject: z.string().max(200).optional(),
  bodyMd: z.string().min(1),
  variables: z
    .array(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        default: z.string().optional(),
      }),
    )
    .default([]),
  active: z.boolean().default(true),
});

router.get("/templates", async (_req, res) => {
  const list = await prisma.notificationTemplate.findMany({ orderBy: { key: "asc" } });
  res.json({ data: list });
});

router.post("/templates", async (req, res) => {
  const body = templateSchema.parse(req.body);
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
  const body = templateSchema.partial().parse(req.body);
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
const broadcastSchema = z.object({
  title: z.string().min(1).max(120),
  bodyMd: z.string().min(1),
  audience: z.string().min(1).max(80),
  channels: z.array(z.enum(["push", "email", "sms"])).default(["push"]),
  scheduledAt: z.string().datetime().optional(),
});

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
  for (const u of users) {
    await notificationsQueue.add(
      `broadcast-${broadcast.id}-${u.id}`,
      {
        userId: u.id,
        type: "broadcast",
        title: broadcast.title,
        body: broadcast.bodyMd,
        data: { broadcastId: broadcast.id },
      },
      { removeOnComplete: true },
    );
  }

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
const cannedSchema = z.object({
  label: z.string().min(1).max(80),
  bodyMd: z.string().min(1),
  category: z.string().max(40).optional(),
});

router.get("/canned-replies", async (_req, res) => {
  const list = await prisma.cannedReply.findMany({ orderBy: { label: "asc" } });
  res.json({ data: list });
});

router.post("/canned-replies", async (req, res) => {
  const body = cannedSchema.parse(req.body);
  const created = await prisma.cannedReply.create({
    data: { ...body, createdById: req.user!.userId },
  });
  res.status(201).json({ data: created });
});

router.patch("/canned-replies/:id", async (req, res) => {
  const body = cannedSchema.partial().parse(req.body);
  const updated = await prisma.cannedReply.update({ where: { id: req.params.id }, data: body });
  res.json({ data: updated });
});

router.delete("/canned-replies/:id", async (req, res) => {
  await prisma.cannedReply.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

// ─── Audit log ───────────────────────────────────────────────
router.get("/audit-logs", async (req, res) => {
  const limit = Math.min(200, Number(req.query.limit) || 100);
  const skip = Math.max(0, Number(req.query.skip) || 0);
  const where: Record<string, unknown> = {};
  if (req.query.action) where.action = String(req.query.action);
  if (req.query.entity) where.entity = String(req.query.entity);
  if (req.query.userId) where.userId = String(req.query.userId);
  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip,
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);
  res.json({ data: items, total, limit, skip });
});

// ─── Impersonation ───────────────────────────────────────────
router.post("/impersonate/:userId", async (req, res) => {
  const adminId = req.user!.userId;
  await requireAdmin(adminId);
  const target = await prisma.user.findUnique({ where: { id: req.params.userId } });
  if (!target) throw AppError.notFound("User not found");
  const token = signAccessToken(
    { userId: target.id, accountType: target.accountType, actingAs: adminId } as never,
    "30m",
  );
  await writeAudit(adminId, target.id, "impersonate.start", "user", target.id, null);
  res.json({ token, target: { id: target.id, name: target.name, email: target.email } });
});

router.post("/end-impersonation", async (req, res) => {
  const adminId = (req.user as never as { actingAs?: string }).actingAs ?? req.user!.userId;
  await writeAudit(adminId, req.user!.userId, "impersonate.end", "user", req.user!.userId, null);
  res.json({ success: true });
});

// ─── Business config ─────────────────────────────────────────
router.get("/business-hours", async (_req, res) => {
  const list = await prisma.businessHours.findMany({ orderBy: { dayOfWeek: "asc" } });
  res.json({ data: list });
});

router.put("/business-hours", async (req, res) => {
  const schema = z.array(
    z.object({
      dayOfWeek: z.number().int().min(0).max(6),
      openHHMM: z.string().regex(/^\d{2}:\d{2}$/),
      closeHHMM: z.string().regex(/^\d{2}:\d{2}$/),
      locationId: z.string().nullable().optional(),
      active: z.boolean().default(true),
    }),
  );
  const body = schema.parse(req.body);
  // Replace-all strategy: drop existing rows, insert new set.
  await prisma.$transaction([
    prisma.businessHours.deleteMany({}),
    prisma.businessHours.createMany({
      data: body.map((h) => ({
        dayOfWeek: h.dayOfWeek,
        openHHMM: h.openHHMM,
        closeHHMM: h.closeHHMM,
        locationId: h.locationId ?? null,
        active: h.active,
      })),
    }),
  ]);
  await writeAudit(req.user!.userId, null, "business.hours-update", "business_hours", null, null);
  res.json({ success: true });
});

router.get("/holidays", async (_req, res) => {
  const list = await prisma.holiday.findMany({ orderBy: { date: "asc" } });
  res.json({ data: list });
});

router.post("/holidays", async (req, res) => {
  const schema = z.object({
    date: z.string(),
    name: z.string().min(1).max(120),
    closed: z.boolean().default(true),
  });
  const body = schema.parse(req.body);
  const created = await prisma.holiday.create({
    data: { date: new Date(body.date), name: body.name, closed: body.closed },
  });
  await writeAudit(req.user!.userId, null, "holiday.create", "holiday", created.id, body);
  res.status(201).json({ data: created });
});

router.delete("/holidays/:id", async (req, res) => {
  await prisma.holiday.delete({ where: { id: req.params.id } });
  await writeAudit(req.user!.userId, null, "holiday.delete", "holiday", req.params.id, null);
  res.json({ success: true });
});

router.get("/feature-flags", async (_req, res) => {
  const list = await prisma.featureFlag.findMany({ orderBy: { key: "asc" } });
  res.json({ data: list });
});

router.patch("/feature-flags/:key", async (req, res) => {
  const schema = z.object({ enabled: z.boolean(), description: z.string().max(300).optional() });
  const body = schema.parse(req.body);
  const updated = await prisma.featureFlag.upsert({
    where: { key: req.params.key },
    update: body,
    create: { key: req.params.key, ...body },
  });
  await writeAudit(req.user!.userId, null, "flag.toggle", "feature_flag", updated.id, body);
  res.json({ data: updated });
});

router.get("/sales-targets", async (_req, res) => {
  const list = await prisma.salesTarget.findMany({
    orderBy: [{ month: "desc" }, { agentId: "asc" }],
    include: { agent: { select: { id: true, name: true, email: true } } },
  });
  res.json({ data: list });
});

router.post("/sales-targets", async (req, res) => {
  const schema = z.object({
    agentId: z.string().uuid(),
    targetMonthly: z.number().positive(),
    month: z.string(),
    commissionPct: z.number().min(0).max(100).default(0),
  });
  const body = schema.parse(req.body);
  const monthDate = new Date(body.month);
  monthDate.setUTCDate(1);
  const created = await prisma.salesTarget.upsert({
    where: { agentId_month: { agentId: body.agentId, month: monthDate } },
    update: { targetMonthly: body.targetMonthly, commissionPct: body.commissionPct },
    create: {
      agentId: body.agentId,
      targetMonthly: body.targetMonthly,
      month: monthDate,
      commissionPct: body.commissionPct,
    },
  });
  // Mirror to user.salesTargetMonthly if month is current
  const now = new Date();
  if (
    monthDate.getUTCFullYear() === now.getUTCFullYear() &&
    monthDate.getUTCMonth() === now.getUTCMonth()
  ) {
    await prisma.user.update({
      where: { id: body.agentId },
      data: { salesTargetMonthly: body.targetMonthly },
    });
  }
  await writeAudit(req.user!.userId, null, "target.set", "sales_target", created.id, body);
  res.json({ data: created });
});

// ─── Generic record viewer (whitelist of tables, read-only paginated) ─────
const RECORD_MAP: Record<string, string> = {
  users: "user",
  vehicles: "vehicle",
  bookings: "booking",
  salesListings: "salesListing",
  repairRequests: "repairRequest",
  supportTickets: "supportTicket",
  leads: "lead",
  vehicleMaintenance: "vehicleMaintenance",
  alertEvents: "alertEvent",
  conversations: "conversation",
  notifications: "notification",
  reviews: "review",
};
router.get("/records/:table", async (req, res) => {
  const table = req.params.table;
  const limit = Math.min(200, Number(req.query.limit) || 50);
  const skip = Math.max(0, Number(req.query.skip) || 0);
  const search = String(req.query.q ?? "");
  const modelKey = RECORD_MAP[table];
  if (!modelKey) throw AppError.badRequest("Unknown table");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = (prisma as any)[modelKey];
  const where = search
    ? table === "users"
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }
      : table === "vehicles"
        ? { name: { contains: search, mode: "insensitive" } }
        : {}
    : {};
  const [items, total] = await Promise.all([
    client.findMany({ where, take: limit, skip, orderBy: { createdAt: "desc" } }),
    client.count({ where }),
  ]);
  res.json({ data: items, total, limit, skip });
});

export { router as godModeRoutes };
