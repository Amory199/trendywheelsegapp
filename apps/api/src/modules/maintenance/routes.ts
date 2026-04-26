import { Router, type Router as RouterType } from "express";
import { z } from "zod";

import { prisma } from "../../config/database.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { AppError } from "../../utils/errors.js";

const router: RouterType = Router();

router.use(authenticate, authorize("admin", "staff"));

// ─── List maintenance appointments ───────────────────────────
router.get("/", async (req, res) => {
  const { vehicleId, completed, from, to } = req.query as Record<string, string>;
  const where: Record<string, unknown> = {};
  if (vehicleId) where.vehicleId = vehicleId;
  if (completed === "true") where.completedAt = { not: null };
  else if (completed === "false") where.completedAt = null;
  if (from || to) {
    where.scheduledAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }
  const items = await prisma.vehicleMaintenance.findMany({
    where,
    orderBy: { scheduledAt: "asc" },
    include: { vehicle: { select: { id: true, name: true, type: true } } },
    take: 500,
  });
  res.json({ data: items });
});

router.get("/:id", async (req, res) => {
  const item = await prisma.vehicleMaintenance.findUnique({
    where: { id: req.params.id },
    include: { vehicle: { select: { id: true, name: true, type: true } } },
  });
  if (!item) throw AppError.notFound("Maintenance appointment not found");
  res.json({ data: item });
});

// ─── Create ──────────────────────────────────────────────────
const createSchema = z.object({
  vehicleId: z.string().uuid(),
  type: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  scheduledAt: z.string().datetime(),
  cost: z.number().min(0).optional(),
  notes: z.string().max(2000).optional(),
  photos: z.array(z.string().url()).max(10).optional(),
});

router.post("/", async (req, res) => {
  const body = createSchema.parse(req.body);
  const vehicle = await prisma.vehicle.findUnique({ where: { id: body.vehicleId }, select: { id: true } });
  if (!vehicle) throw AppError.notFound("Vehicle not found");

  const item = await prisma.vehicleMaintenance.create({
    data: {
      vehicleId: body.vehicleId,
      type: body.type,
      description: body.description,
      scheduledAt: new Date(body.scheduledAt),
      cost: body.cost,
      notes: body.notes,
      photos: (body.photos ?? []) as never,
    },
    include: { vehicle: { select: { id: true, name: true, type: true } } },
  });
  res.status(201).json({ data: item });
});

// ─── Update / reschedule ────────────────────────────────────
const updateSchema = z.object({
  type: z.string().min(1).max(120).optional(),
  description: z.string().max(2000).optional(),
  scheduledAt: z.string().datetime().optional(),
  cost: z.number().min(0).optional(),
  notes: z.string().max(2000).optional(),
  photos: z.array(z.string().url()).max(10).optional(),
});

router.put("/:id", async (req, res) => {
  const body = updateSchema.parse(req.body);
  const existing = await prisma.vehicleMaintenance.findUnique({ where: { id: req.params.id } });
  if (!existing) throw AppError.notFound("Maintenance appointment not found");

  const data: Record<string, unknown> = { ...body };
  if (body.scheduledAt) data.scheduledAt = new Date(body.scheduledAt);
  if (body.photos) data.photos = body.photos as never;

  const item = await prisma.vehicleMaintenance.update({
    where: { id: req.params.id },
    data: data as never,
    include: { vehicle: { select: { id: true, name: true, type: true } } },
  });
  res.json({ data: item });
});

// ─── Mark completed ──────────────────────────────────────────
const completeSchema = z.object({
  cost: z.number().min(0).optional(),
  notes: z.string().max(2000).optional(),
  photos: z.array(z.string().url()).max(10).optional(),
});

router.post("/:id/complete", async (req, res) => {
  const body = completeSchema.parse(req.body);
  const existing = await prisma.vehicleMaintenance.findUnique({ where: { id: req.params.id } });
  if (!existing) throw AppError.notFound("Maintenance appointment not found");

  const data: Record<string, unknown> = {
    completedAt: existing.completedAt ?? new Date(),
    ...body,
  };
  if (body.photos) data.photos = body.photos as never;

  const item = await prisma.vehicleMaintenance.update({
    where: { id: req.params.id },
    data: data as never,
    include: { vehicle: { select: { id: true, name: true, type: true } } },
  });

  // Resolve any "maintenance-due" alerts for this vehicle.
  await prisma.alertEvent.updateMany({
    where: { type: "maintenance-due", vehicleId: existing.vehicleId, resolvedAt: null },
    data: { resolvedAt: new Date() },
  });

  res.json({ data: item });
});

// ─── Delete ──────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  const existing = await prisma.vehicleMaintenance.findUnique({ where: { id: req.params.id } });
  if (!existing) throw AppError.notFound("Maintenance appointment not found");
  await prisma.vehicleMaintenance.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

export { router as maintenanceRoutes };
