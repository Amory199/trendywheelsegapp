import { Router, type Router as RouterType } from "express";
import { z } from "zod";

import { prisma } from "../../config/database.js";
import { authenticate, authorize } from "../../middleware/auth.js";

const router: RouterType = Router();

router.use(authenticate, authorize("admin", "staff"));

// ─── System config (single-row, upsert) ──────────────────────
router.get("/system-config", async (_req, res) => {
  const config =
    (await prisma.systemConfig.findFirst({ orderBy: { updatedAt: "desc" } })) ??
    (await prisma.systemConfig.create({ data: {} }));
  res.json({ data: config });
});

const updateSystemConfigSchema = z.object({
  companyName: z.string().min(1).max(120).optional(),
  companyEmail: z.string().email().nullable().optional(),
  companyPhone: z.string().max(40).nullable().optional(),
  companyAddress: z.string().max(500).nullable().optional(),
  companyHours: z.string().max(200).nullable().optional(),
  currency: z.enum(["EGP", "USD", "EUR"]).optional(),
  taxRatePct: z.number().min(0).max(100).optional(),
  emailTemplates: z.record(z.string(), z.unknown()).optional(),
});

router.patch("/system-config", async (req, res) => {
  const body = updateSystemConfigSchema.parse(req.body);
  const userId = req.user!.userId;
  const existing = await prisma.systemConfig.findFirst({ orderBy: { updatedAt: "desc" } });
  // emailTemplates is JSON; Prisma typings demand InputJsonValue, but our zod
  // schema produces Record<string, unknown>. Cast through unknown — runtime is JSON-safe.
  const data = { ...body, updatedById: userId } as never;
  const updated = existing
    ? await prisma.systemConfig.update({ where: { id: existing.id }, data })
    : await prisma.systemConfig.create({ data });
  res.json({ data: updated });
});

router.get("/metrics", async (_req, res) => {
  const [
    totalUsers,
    activeBookings,
    availableVehicles,
    totalVehicles,
    pendingRepairs,
    activeListings,
    openTickets,
    revenueAgg,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.booking.count({ where: { status: "confirmed" } }),
    prisma.vehicle.count({ where: { status: "available" } }),
    prisma.vehicle.count(),
    prisma.repairRequest.count({ where: { status: { in: ["submitted", "assigned", "in_progress"] } } }),
    prisma.salesListing.count({ where: { status: "active" } }),
    prisma.supportTicket.count({ where: { status: { in: ["open", "in_progress"] } } }),
    prisma.booking.aggregate({
      where: { paymentStatus: "paid" },
      _sum: { totalCost: true },
    }),
  ]);

  res.json({
    data: {
      users: { total: totalUsers },
      bookings: { active: activeBookings },
      vehicles: { available: availableVehicles, total: totalVehicles },
      repairs: { pending: pendingRepairs },
      sales: { active: activeListings },
      support: { open: openTickets },
      revenue: { total: Number(revenueAgg._sum.totalCost ?? 0) },
    },
  });
});

router.get("/booking-trend", async (req, res) => {
  const days = Math.min(90, Math.max(7, Number(req.query.days ?? 30)));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [bookings, listings] = await Promise.all([
    prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
      SELECT date_trunc('day', created_at) AS day, COUNT(*)::bigint AS count
      FROM bookings
      WHERE created_at >= ${since}
      GROUP BY day
      ORDER BY day ASC
    `,
    prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
      SELECT date_trunc('day', created_at) AS day, COUNT(*)::bigint AS count
      FROM sales_listings
      WHERE created_at >= ${since}
      GROUP BY day
      ORDER BY day ASC
    `,
  ]);

  // Build a contiguous day-by-day series so the chart has no gaps.
  const byDate = new Map<string, { rentals: number; sales: number }>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since.getTime() + i * 24 * 60 * 60 * 1000);
    d.setUTCHours(0, 0, 0, 0);
    byDate.set(d.toISOString(), { rentals: 0, sales: 0 });
  }
  for (const row of bookings) {
    const k = new Date(row.day).toISOString();
    const cur = byDate.get(k);
    if (cur) cur.rentals = Number(row.count);
  }
  for (const row of listings) {
    const k = new Date(row.day).toISOString();
    const cur = byDate.get(k);
    if (cur) cur.sales = Number(row.count);
  }

  res.json({
    data: Array.from(byDate.entries()).map(([date, v]) => ({ date, ...v })),
  });
});

router.get("/revenue-breakdown", async (_req, res) => {
  const grouped = await prisma.booking.groupBy({
    by: ["vehicleId"],
    where: { paymentStatus: "paid" },
    _sum: { totalCost: true },
  });

  const vehicleIds = grouped.map((g: { vehicleId: string }) => g.vehicleId);
  const vehicles = await prisma.vehicle.findMany({
    where: { id: { in: vehicleIds } },
    select: { id: true, type: true },
  });
  const typeById = new Map<string, string>(
    vehicles.map((v: { id: string; type: string }) => [v.id, String(v.type)] as const),
  );

  const byType = new Map<string, number>();
  for (const row of grouped) {
    const type: string = typeById.get(row.vehicleId) ?? "OTHER";
    const amount = Number(row._sum.totalCost ?? 0);
    byType.set(type, (byType.get(type) ?? 0) + amount);
  }

  const total = Array.from(byType.values()).reduce((s, n) => s + n, 0);
  const data = Array.from(byType.entries())
    .map(([type, amount]) => ({
      type,
      amount,
      percentage: total > 0 ? Number(((amount / total) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  res.json({ data });
});

// ─── CRM / customer profiles ─────────────────────────────────
router.get("/customers", async (req, res) => {
  const { q, page = "1", limit = "25" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(100, Math.max(1, Number(limit)));

  const where: Record<string, unknown> = { accountType: "customer" };
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        loyaltyTier: true,
        loyaltyPoints: true,
        createdAt: true,
        _count: {
          select: {
            bookings: true,
            supportTickets: true,
            repairRequests: true,
            salesListings: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  res.json({ data: users, total, page: pageNum, limit: limitNum });
});

// ─── Customer notes (CRM) ────────────────────────────────────
const createNoteSchema = z.object({ body: z.string().min(1).max(5000) });

router.get("/customers/:id/notes", async (req, res) => {
  const notes = await prisma.customerNote.findMany({
    where: { customerId: req.params.id },
    orderBy: { createdAt: "desc" },
    include: { author: { select: { id: true, name: true } } },
    take: 200,
  });
  res.json({ data: notes });
});

router.post("/customers/:id/notes", async (req, res) => {
  const { body } = createNoteSchema.parse(req.body);
  const note = await prisma.customerNote.create({
    data: { customerId: req.params.id, authorId: req.user!.userId, body },
    include: { author: { select: { id: true, name: true } } },
  });
  res.status(201).json({ data: note });
});

router.delete("/customers/:id/notes/:noteId", async (req, res) => {
  const note = await prisma.customerNote.findUnique({ where: { id: req.params.noteId } });
  if (!note) {
    res.status(404).json({ message: "Note not found" });
    return;
  }
  if (note.authorId !== req.user!.userId && req.user!.accountType !== "admin") {
    res.status(403).json({ message: "Cannot delete another agent's note" });
    return;
  }
  await prisma.customerNote.delete({ where: { id: note.id } });
  res.json({ success: true });
});

router.get("/customers/:id", async (req, res) => {
  const { id } = req.params;
  const [user, bookings, tickets, repairs, listings] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        accountType: true,
        loyaltyTier: true,
        loyaltyPoints: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.booking.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { vehicle: { select: { id: true, name: true, type: true } } },
    }),
    prisma.supportTicket.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.repairRequest.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.salesListing.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  if (!user) {
    res.status(404).json({ message: "Customer not found" });
    return;
  }

  res.json({ data: { user, bookings, tickets, repairs, listings } });
});

// ─── Platform-wide messages oversight ────────────────────────
router.get("/conversations", async (req, res) => {
  const { page = "1", limit = "30" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(100, Math.max(1, Number(limit)));

  const [conversations, total] = await Promise.all([
    prisma.conversation.findMany({
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      orderBy: { lastMessageAt: "desc" },
      include: {
        participants: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
    prisma.conversation.count(),
  ]);

  res.json({ data: conversations, total, page: pageNum, limit: limitNum });
});

// ─── Platform-wide notifications feed ────────────────────────
router.get("/notifications", async (req, res) => {
  const { page = "1", limit = "50" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(200, Math.max(1, Number(limit)));

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.notification.count(),
  ]);

  res.json({ data: notifications, total, page: pageNum, limit: limitNum });
});

router.get("/recent-activity", async (_req, res) => {
  const [bookings, repairs, listings] = await Promise.all([
    prisma.booking.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true } }, vehicle: { select: { name: true } } },
    }),
    prisma.repairRequest.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true } } },
    }),
    prisma.salesListing.findMany({ take: 10, orderBy: { createdAt: "desc" } }),
  ]);

  res.json({ data: { bookings, repairs, listings } });
});

export { router as adminRoutes };
