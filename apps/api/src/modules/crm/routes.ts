import { Router, type Router as RouterType } from "express";
import { z } from "zod";

import { prisma } from "../../config/database.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { AppError } from "../../utils/errors.js";

import {
  assignLeadRoundRobin,
  computeAgentTargets,
  recordActivity,
} from "./service.js";

const router: RouterType = Router();

router.use(authenticate, authorize("admin", "staff"));

// ─── List leads (filterable) ─────────────────────────────────
router.get("/leads", async (req, res) => {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const ownerId = typeof req.query.ownerId === "string" ? req.query.ownerId : undefined;
  const mineOnly = req.query.mine === "1";
  const userId = req.user!.userId;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (mineOnly) where.ownerId = userId;
  else if (ownerId) where.ownerId = ownerId === "unassigned" ? null : ownerId;

  const leads = await prisma.lead.findMany({
    where,
    orderBy: [{ status: "asc" }, { lastActivityAt: "desc" }],
    include: {
      owner: { select: { id: true, name: true, email: true, staffRole: true } },
      customer: { select: { id: true, name: true, phone: true, email: true } },
      _count: { select: { activities: true } },
    },
    take: 500,
  });
  res.json({ data: leads });
});

// ─── Pipeline KPIs ───────────────────────────────────────────
router.get("/pipeline", async (req, res) => {
  const userId = req.user!.userId;
  const me = await prisma.user.findUnique({ where: { id: userId } });
  const isAdmin = me?.accountType === "admin" || me?.staffRole === "admin";

  const where = isAdmin ? {} : { ownerId: userId };

  const [byStatus, totals, recent, mine] = await Promise.all([
    prisma.lead.groupBy({
      by: ["status"],
      where,
      _count: { _all: true },
      _sum: { estimatedValue: true },
    }),
    prisma.lead.aggregate({
      where,
      _count: { _all: true },
      _sum: { estimatedValue: true },
    }),
    prisma.lead.findMany({
      where,
      orderBy: { lastActivityAt: "desc" },
      take: 8,
      include: {
        owner: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true } },
      },
    }),
    isAdmin ? Promise.resolve(null) : computeAgentTargets(userId),
  ]);

  type StatusBucket = {
    status: string;
    _count: { _all: number };
    _sum: { estimatedValue: unknown };
  };
  res.json({
    data: {
      byStatus: (byStatus as unknown as StatusBucket[]).map((b) => ({
        status: b.status,
        count: b._count._all,
        value: Number(b._sum.estimatedValue ?? 0),
      })),
      totals: {
        count: totals._count._all,
        value: Number(totals._sum.estimatedValue ?? 0),
      },
      recent,
      myTarget: mine,
    },
  });
});

// ─── Team list (for admin) ───────────────────────────────────
router.get("/team", async (_req, res) => {
  const team = await prisma.user.findMany({
    where: { accountType: { in: ["admin", "staff"] }, status: "active" },
    select: {
      id: true,
      name: true,
      email: true,
      staffRole: true,
      salesTargetMonthly: true,
      salesAssignmentWeight: true,
    },
    orderBy: { name: "asc" },
  });

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const stats = await prisma.lead.groupBy({
    by: ["ownerId", "status"],
    where: { ownerId: { not: null }, updatedAt: { gte: monthStart } },
    _count: { _all: true },
    _sum: { estimatedValue: true },
  });

  type TeamMember = {
    id: string;
    name: string;
    email: string | null;
    staffRole: string | null;
    salesTargetMonthly: unknown;
    salesAssignmentWeight: number;
  };
  type LeadStat = {
    ownerId: string | null;
    status: string;
    _count: { _all: number };
    _sum: { estimatedValue: unknown };
  };
  const teamTyped = team as unknown as TeamMember[];
  const statsTyped = stats as unknown as LeadStat[];
  const enriched = teamTyped.map((member: TeamMember) => {
    const memberStats = statsTyped.filter((s: LeadStat) => s.ownerId === member.id);
    const won = memberStats.filter((s: LeadStat) => s.status === "won");
    const wonAmount = won.reduce((acc: number, s: LeadStat) => acc + Number(s._sum.estimatedValue ?? 0), 0);
    const wonCount = won.reduce((acc: number, s: LeadStat) => acc + s._count._all, 0);
    const openCount = memberStats
      .filter((s: LeadStat) => !["won", "lost"].includes(s.status))
      .reduce((acc: number, s: LeadStat) => acc + s._count._all, 0);
    return {
      ...member,
      monthWonAmount: wonAmount,
      monthWonCount: wonCount,
      openLeads: openCount,
      progressPct: member.salesTargetMonthly
        ? Math.min(100, Math.round((wonAmount / Number(member.salesTargetMonthly)) * 100))
        : null,
    };
  });

  res.json({ data: enriched });
});

// ─── Get one lead ────────────────────────────────────────────
router.get("/leads/:id", async (req, res) => {
  const lead = await prisma.lead.findUnique({
    where: { id: req.params.id },
    include: {
      owner: { select: { id: true, name: true, email: true, staffRole: true } },
      customer: { select: { id: true, name: true, phone: true, email: true, loyaltyTier: true, createdAt: true } },
      activities: {
        orderBy: { createdAt: "desc" },
        take: 100,
        include: { actor: { select: { id: true, name: true } } },
      },
    },
  });
  if (!lead) throw AppError.notFound("Lead not found");
  res.json({ data: lead });
});

// ─── Create lead manually ────────────────────────────────────
const createLeadSchema = z.object({
  contactName: z.string().min(1).max(120),
  contactPhone: z.string().max(40).optional(),
  contactEmail: z.string().email().optional(),
  estimatedValue: z.number().min(0).optional(),
  notes: z.string().max(2000).optional(),
  source: z.enum(["signup", "rent-inquiry", "sell-inquiry", "repair-inquiry", "manual", "imported"]).optional(),
});

router.post("/leads", async (req, res) => {
  const body = createLeadSchema.parse(req.body);
  const userId = req.user!.userId;
  const sourceMap: Record<string, "signup" | "rent_inquiry" | "sell_inquiry" | "repair_inquiry" | "manual" | "imported"> = {
    signup: "signup",
    "rent-inquiry": "rent_inquiry",
    "sell-inquiry": "sell_inquiry",
    "repair-inquiry": "repair_inquiry",
    manual: "manual",
    imported: "imported",
  };
  const lead = await prisma.lead.create({
    data: {
      contactName: body.contactName,
      contactPhone: body.contactPhone,
      contactEmail: body.contactEmail,
      estimatedValue: body.estimatedValue ?? 0,
      notes: body.notes,
      source: sourceMap[body.source ?? "manual"],
    },
  });
  await recordActivity(lead.id, userId, "created", "Lead created manually");
  // Try immediate assignment
  await assignLeadRoundRobin(lead.id);
  const fresh = await prisma.lead.findUnique({
    where: { id: lead.id },
    include: { owner: { select: { id: true, name: true } } },
  });
  res.status(201).json({ data: fresh });
});

// ─── Update lead status / value / notes ──────────────────────
const updateLeadSchema = z.object({
  status: z.enum(["new", "contacted", "qualified", "proposal", "won", "lost"]).optional(),
  estimatedValue: z.number().min(0).optional(),
  notes: z.string().max(2000).optional(),
});

router.patch("/leads/:id", async (req, res) => {
  const body = updateLeadSchema.parse(req.body);
  const userId = req.user!.userId;
  const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
  if (!lead) throw AppError.notFound("Lead not found");

  const me = await prisma.user.findUnique({ where: { id: userId } });
  const isAdmin = me?.accountType === "admin" || me?.staffRole === "admin";
  if (!isAdmin && lead.ownerId !== userId) {
    throw AppError.forbidden("You don't own this lead");
  }

  const data: Record<string, unknown> = {
    ...body,
    lastActivityAt: new Date(),
  };
  if (body.status === "won" || body.status === "lost") {
    data.closedAt = new Date();
  }

  const updated = await prisma.lead.update({ where: { id: lead.id }, data });

  if (body.status && body.status !== lead.status) {
    await recordActivity(
      lead.id,
      userId,
      body.status === "won" ? "won" : body.status === "lost" ? "lost" : "status-change",
      `Status changed to ${body.status}`,
    );
  }
  if (body.notes !== undefined && body.notes !== lead.notes) {
    await recordActivity(lead.id, userId, "note", "Notes updated");
  }

  res.json({ data: updated });
});

// ─── Claim a lead (unassigned → me) ──────────────────────────
router.post("/leads/:id/claim", async (req, res) => {
  const userId = req.user!.userId;
  const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
  if (!lead) throw AppError.notFound("Lead not found");
  if (lead.ownerId && lead.ownerId !== userId) {
    throw AppError.forbidden("Lead already owned by another agent");
  }
  const ttlMs = 24 * 60 * 60 * 1000;
  const updated = await prisma.lead.update({
    where: { id: lead.id },
    data: {
      ownerId: userId,
      assignedAt: new Date(),
      claimDeadline: new Date(Date.now() + ttlMs),
      lastActivityAt: new Date(),
    },
  });
  await recordActivity(lead.id, userId, "assigned", "Lead claimed");
  res.json({ data: updated });
});

// ─── Reassign (admin) ────────────────────────────────────────
const reassignSchema = z.object({ ownerId: z.string().uuid().nullable() });
router.post("/leads/:id/reassign", async (req, res) => {
  const body = reassignSchema.parse(req.body);
  const userId = req.user!.userId;
  const me = await prisma.user.findUnique({ where: { id: userId } });
  const isAdmin = me?.accountType === "admin" || me?.staffRole === "admin";
  if (!isAdmin) throw AppError.forbidden("Admins only");

  const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
  if (!lead) throw AppError.notFound("Lead not found");

  const ttlMs = 24 * 60 * 60 * 1000;
  const updated = await prisma.lead.update({
    where: { id: lead.id },
    data: {
      ownerId: body.ownerId,
      assignedAt: body.ownerId ? new Date() : null,
      claimDeadline: body.ownerId ? new Date(Date.now() + ttlMs) : null,
      lastActivityAt: new Date(),
      reassignmentCount: { increment: 1 },
    },
  });
  await recordActivity(
    lead.id,
    userId,
    "reassigned",
    body.ownerId ? `Reassigned to agent ${body.ownerId}` : "Returned to pool",
  );
  res.json({ data: updated });
});

// ─── Add activity (note/call/email log) ──────────────────────
const activitySchema = z.object({
  type: z.enum(["note", "call", "email"]),
  body: z.string().min(1).max(2000),
});

router.post("/leads/:id/activities", async (req, res) => {
  const body = activitySchema.parse(req.body);
  const userId = req.user!.userId;
  const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
  if (!lead) throw AppError.notFound("Lead not found");
  await recordActivity(lead.id, userId, body.type, body.body);
  await prisma.lead.update({
    where: { id: lead.id },
    data: { lastActivityAt: new Date() },
  });
  res.status(201).json({ success: true });
});

export { router as crmRoutes };
