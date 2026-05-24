import { Router, type Router as RouterType } from "express";
import { z } from "zod";

import { prisma } from "../../config/database.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { alertEvaluatorQueue, leadSweeperQueue, remindersQueue } from "../../queues/index.js";
import { isAdmin } from "../../utils/auth-roles.js";
import { AppError } from "../../utils/errors.js";
import { signAccessToken } from "../auth/service.js";

import { writeAudit } from "./audit.js";
import { godModeContentRoutes } from "./godmode-content.js";

const router: RouterType = Router();

router.use(authenticate, authorize("admin"));

// Mount the marketing/content management routes (promos, pricing, templates,
// broadcasts, canned replies) — split off into godmode-content.ts to keep
// this file focused on ops levers + audit + impersonation + record viewer.
router.use("/", godModeContentRoutes);

const requireAdmin = async (userId: string): Promise<void> => {
  const me = await prisma.user.findUnique({ where: { id: userId } });
  if (!isAdmin(me)) {
    throw AppError.forbidden("Admins only");
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
