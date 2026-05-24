import { Router, type Router as RouterType } from "express";
import { z } from "zod";

import { prisma } from "../../config/database.js";
import { authenticate } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { AppError } from "../../utils/errors.js";
import { emitDomainEvent, notifyAdmins } from "../../utils/notify.js";

const router: RouterType = Router();

const STAFF = new Set(["admin", "staff"]);

const SERVICE_STATUS = z.enum(["submitted", "assigned", "in-progress", "completed", "cancelled"]);

const updateMaintenanceSchema = z.object({
  status: SERVICE_STATUS.optional(),
  notes: z.string().max(2000).optional().nullable(),
  estimatedCost: z.coerce.number().nonnegative().optional().nullable(),
  assignedToId: z.string().uuid().optional().nullable(),
  preferredDate: z.string().datetime().optional(),
});

const updateCustomizationSchema = z.object({
  status: SERVICE_STATUS.optional(),
  notes: z.string().max(2000).optional().nullable(),
  budget: z.coerce.number().nonnegative().optional().nullable(),
  assignedToId: z.string().uuid().optional().nullable(),
});

const updateTransportSchema = z.object({
  status: SERVICE_STATUS.optional(),
  cargoNotes: z.string().max(2000).optional().nullable(),
  priceEgp: z.coerce.number().nonnegative().optional().nullable(),
  driverId: z.string().uuid().optional().nullable(),
  pickupAt: z.string().datetime().optional(),
});

// ─── Maintenance ────────────────────────────────────────────────────────

const createMaintenanceSchema = z.object({
  serviceType: z.enum(["oil", "battery", "tire", "inspection", "full"]),
  preferredDate: z.string().datetime(),
  vehicleId: z.string().uuid().optional(),
  notes: z.string().max(2000).optional(),
});

router.get("/maintenance", authenticate, async (req, res) => {
  const isStaff = STAFF.has(req.user!.accountType);
  const where: Record<string, unknown> = isStaff ? {} : { userId: req.user!.userId };
  if (req.query.status) where.status = String(req.query.status);
  const data = await prisma.maintenanceRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { id: true, name: true, phone: true } } },
  });
  res.json({ data });
});

router.get("/maintenance/:id", authenticate, async (req, res) => {
  const row = await prisma.maintenanceRequest.findUnique({
    where: { id: req.params.id },
    include: { user: { select: { id: true, name: true, phone: true } } },
  });
  if (!row) throw AppError.notFound("Not found");
  if (!STAFF.has(req.user!.accountType) && row.userId !== req.user!.userId) {
    throw AppError.forbidden();
  }
  res.json({ data: row });
});

router.post(
  "/maintenance",
  authenticate,
  validate({ body: createMaintenanceSchema }),
  async (req, res) => {
    const created = await prisma.maintenanceRequest.create({
      data: {
        ...req.body,
        userId: req.user!.userId,
        preferredDate: new Date(req.body.preferredDate),
      },
    });
    emitDomainEvent("maintenance.created", created.id, req.user!.userId, {
      serviceType: created.serviceType,
      preferredDate: created.preferredDate,
    });
    await notifyAdmins(`maint-${created.id}`, {
      type: "maintenance_pending",
      title: "New maintenance request",
      body: `${created.serviceType} · ${new Date(created.preferredDate).toLocaleDateString()}`,
      data: { maintenanceId: created.id, url: "/service/maintenance" },
    });
    res.status(201).json({ data: created });
  },
);

router.patch(
  "/maintenance/:id",
  authenticate,
  validate({ body: updateMaintenanceSchema }),
  async (req, res) => {
    if (!STAFF.has(req.user!.accountType)) throw AppError.forbidden();
    const data: Record<string, unknown> = { ...req.body };
    if (data.preferredDate) data.preferredDate = new Date(data.preferredDate as string);
    const updated = await prisma.maintenanceRequest.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ data: updated });
  },
);

// ─── Customization ──────────────────────────────────────────────────────

const createCustomizationSchema = z.object({
  kind: z.enum(["paint", "lights", "wrap", "audio", "other"]),
  budget: z.coerce.number().positive().optional(),
  vehicleId: z.string().uuid().optional(),
  notes: z.string().max(2000).optional(),
});

router.get("/customization", authenticate, async (req, res) => {
  const isStaff = STAFF.has(req.user!.accountType);
  const where: Record<string, unknown> = isStaff ? {} : { userId: req.user!.userId };
  if (req.query.status) where.status = String(req.query.status);
  const data = await prisma.customizationRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { id: true, name: true, phone: true } } },
  });
  res.json({ data });
});

router.get("/customization/:id", authenticate, async (req, res) => {
  const row = await prisma.customizationRequest.findUnique({
    where: { id: req.params.id },
    include: { user: { select: { id: true, name: true, phone: true } } },
  });
  if (!row) throw AppError.notFound("Not found");
  if (!STAFF.has(req.user!.accountType) && row.userId !== req.user!.userId) {
    throw AppError.forbidden();
  }
  res.json({ data: row });
});

router.post(
  "/customization",
  authenticate,
  validate({ body: createCustomizationSchema }),
  async (req, res) => {
    const created = await prisma.customizationRequest.create({
      data: { ...req.body, userId: req.user!.userId },
    });
    emitDomainEvent("customization.created", created.id, req.user!.userId, {
      kind: created.kind,
      budget: created.budget ?? null,
    });
    await notifyAdmins(`cust-${created.id}`, {
      type: "customization_pending",
      title: "New customization request",
      body: `${created.kind}${created.budget ? ` · EGP ${created.budget.toLocaleString()}` : ""}`,
      data: { customizationId: created.id, url: "/service/customization" },
    });
    res.status(201).json({ data: created });
  },
);

router.patch(
  "/customization/:id",
  authenticate,
  validate({ body: updateCustomizationSchema }),
  async (req, res) => {
    if (!STAFF.has(req.user!.accountType)) throw AppError.forbidden();
    const updated = await prisma.customizationRequest.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ data: updated });
  },
);

// ─── Transport (pickup-delivery) ────────────────────────────────────────

const createTransportSchema = z.object({
  fromAddress: z.string().min(3).max(500),
  toAddress: z.string().min(3).max(500),
  pickupAt: z.string().datetime(),
  cargoNotes: z.string().max(2000).optional(),
});

router.get("/transport", authenticate, async (req, res) => {
  const isStaff = STAFF.has(req.user!.accountType);
  const where: Record<string, unknown> = isStaff ? {} : { userId: req.user!.userId };
  if (req.query.status) where.status = String(req.query.status);
  const data = await prisma.transportRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { id: true, name: true, phone: true } } },
  });
  res.json({ data });
});

router.get("/transport/:id", authenticate, async (req, res) => {
  const row = await prisma.transportRequest.findUnique({
    where: { id: req.params.id },
    include: { user: { select: { id: true, name: true, phone: true } } },
  });
  if (!row) throw AppError.notFound("Not found");
  if (!STAFF.has(req.user!.accountType) && row.userId !== req.user!.userId) {
    throw AppError.forbidden();
  }
  res.json({ data: row });
});

router.post(
  "/transport",
  authenticate,
  validate({ body: createTransportSchema }),
  async (req, res) => {
    const created = await prisma.transportRequest.create({
      data: { ...req.body, userId: req.user!.userId, pickupAt: new Date(req.body.pickupAt) },
    });
    emitDomainEvent("pickup.created", created.id, req.user!.userId, {
      fromAddress: created.fromAddress,
      toAddress: created.toAddress,
    });
    await notifyAdmins(`trans-${created.id}`, {
      type: "transport_pending",
      title: "New pickup/delivery request",
      body: `${created.fromAddress.slice(0, 30)} → ${created.toAddress.slice(0, 30)}`,
      data: { transportId: created.id, url: "/service/pickup-delivery" },
    });
    res.status(201).json({ data: created });
  },
);

router.patch(
  "/transport/:id",
  authenticate,
  validate({ body: updateTransportSchema }),
  async (req, res) => {
    if (!STAFF.has(req.user!.accountType)) throw AppError.forbidden();
    const data: Record<string, unknown> = { ...req.body };
    if (data.pickupAt) data.pickupAt = new Date(data.pickupAt as string);
    const updated = await prisma.transportRequest.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ data: updated });
  },
);

export { router as serviceRequestsRoutes };
