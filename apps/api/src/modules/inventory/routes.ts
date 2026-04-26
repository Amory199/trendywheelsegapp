import { Router, type Router as RouterType } from "express";
import { z } from "zod";

import { prisma } from "../../config/database.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { AppError } from "../../utils/errors.js";

const router: RouterType = Router();

router.use(authenticate, authorize("admin", "staff"));

// ─── Alert config (single-row, upsert) ───────────────────────
router.get("/alert-config", async (_req, res) => {
  const config =
    (await prisma.alertConfig.findFirst({ orderBy: { updatedAt: "desc" } })) ??
    (await prisma.alertConfig.create({ data: {} }));
  res.json({ data: config });
});

const updateConfigSchema = z.object({
  utilizationMaxPct: z.number().int().min(0).max(100).optional(),
  maintenanceDueDays: z.number().int().min(1).max(365).optional(),
  maxConcurrentRepairs: z.number().int().min(0).max(1000).optional(),
});

router.patch("/alert-config", async (req, res) => {
  const body = updateConfigSchema.parse(req.body);
  const userId = req.user!.userId;
  const existing = await prisma.alertConfig.findFirst({ orderBy: { updatedAt: "desc" } });
  const updated = existing
    ? await prisma.alertConfig.update({
        where: { id: existing.id },
        data: { ...body, updatedById: userId },
      })
    : await prisma.alertConfig.create({ data: { ...body, updatedById: userId } });
  res.json({ data: updated });
});

// ─── Alert events (fleet-wide signals) ───────────────────────
router.get("/alert-events", async (req, res) => {
  const { resolved } = req.query as Record<string, string>;
  const where: Record<string, unknown> = {};
  if (resolved === "false") where.resolvedAt = null;
  else if (resolved === "true") where.resolvedAt = { not: null };
  const events = await prisma.alertEvent.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { vehicle: { select: { id: true, name: true, type: true } } },
    take: 200,
  });
  res.json({ data: events });
});

router.post("/alert-events/:id/resolve", async (req, res) => {
  const event = await prisma.alertEvent.update({
    where: { id: req.params.id },
    data: { resolvedAt: new Date() },
  });
  res.json({ data: event });
});

// ─── Vehicle condition reports ───────────────────────────────
router.get("/vehicles/:vehicleId/condition-reports", async (req, res) => {
  const { vehicleId } = req.params;
  const reports = await prisma.vehicleConditionReport.findMany({
    where: { vehicleId },
    orderBy: { createdAt: "desc" },
    include: { reporter: { select: { id: true, name: true, email: true } } },
    take: 200,
  });
  res.json({ data: reports });
});

const createReportSchema = z.object({
  notes: z.string().min(1).max(5000),
  photos: z.array(z.string().url()).max(10).default([]),
  severity: z.enum(["minor", "moderate", "severe"]).default("minor"),
});

router.post("/vehicles/:vehicleId/condition-reports", async (req, res) => {
  const { vehicleId } = req.params;
  const body = createReportSchema.parse(req.body);
  const reporterId = req.user!.userId;

  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId }, select: { id: true } });
  if (!vehicle) throw AppError.notFound("Vehicle not found");

  const created = await prisma.vehicleConditionReport.create({
    data: {
      vehicleId,
      reporterId,
      notes: body.notes,
      photos: body.photos,
      severity: body.severity,
    },
    include: { reporter: { select: { id: true, name: true, email: true } } },
  });

  res.status(201).json({ data: created });
});

export { router as inventoryRoutes };
