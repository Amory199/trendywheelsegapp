import { Router, type Router as RouterType } from "express";

import { createCustomerNoteSchema, updateSystemConfigSchema } from "@trendywheels/validators";

import { PAGINATION } from "../../config/limits.js";
import { prisma } from "../../config/database.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { getIO } from "../../utils/io-registry.js";
import { notifyUser } from "../../utils/notify.js";

const router: RouterType = Router();

// Admin console backend — admin-only. Staff have their own surfaces (/api/crm,
// /api/inventory, /api/maintenance, /api/repairs); nothing staff-facing calls
// /api/admin. Granting "staff" here exposed platform metrics, revenue, every
// customer/conversation, and system-config to any sales/support agent (INC-039).
router.use(authenticate, authorize("admin"));

// ─── Global search (admin ⌘K palette) ────────────────────────
// One round-trip for the three entity types the top-bar search promises.
// Small caps keep it snappy — the palette is a jump-to, not a report.
router.get("/search", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  if (q.length < 2) {
    res.json({ data: { users: [], vehicles: [], bookings: [] } });
    return;
  }
  const contains = { contains: q, mode: "insensitive" as const };
  const [users, vehicles, bookings] = await Promise.all([
    prisma.user.findMany({
      where: { OR: [{ name: contains }, { phone: { contains: q } }, { email: contains }] },
      select: { id: true, name: true, phone: true, email: true, accountType: true },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.vehicle.findMany({
      where: { name: contains },
      select: { id: true, name: true, status: true, category: true },
      take: 6,
    }),
    prisma.booking.findMany({
      where: { OR: [{ user: { name: contains } }, { vehicle: { name: contains } }] },
      select: {
        id: true,
        status: true,
        startDate: true,
        user: { select: { name: true } },
        vehicle: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);
  res.json({ data: { users, vehicles, bookings } });
});

// ─── System config (single-row, upsert) ──────────────────────
router.get("/system-config", async (_req, res) => {
  const config =
    (await prisma.systemConfig.findFirst({ orderBy: { updatedAt: "desc" } })) ??
    (await prisma.systemConfig.create({ data: {} }));
  res.json({ data: config });
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
    pendingBookings,
    availableVehicles,
    totalVehicles,
    pendingRepairs,
    activeListings,
    pendingListings,
    openTickets,
    revenueAgg,
  ] = await Promise.all([
    // Exclude soft-deleted users (anonymized with a `deleted_` phone marker) so
    // the dashboard headcount reflects real accounts, not deletion tombstones.
    prisma.user.count({ where: { NOT: { phone: { startsWith: "deleted_" } } } }),
    prisma.booking.count({ where: { status: "confirmed" } }),
    prisma.booking.count({ where: { status: "pending" } }),
    prisma.vehicle.count({ where: { status: "available" } }),
    prisma.vehicle.count(),
    prisma.repairRequest.count({
      where: { status: { in: ["submitted", "assigned", "in_progress"] } },
    }),
    prisma.salesListing.count({ where: { status: "active" } }),
    prisma.salesListing.count({ where: { status: "pending" } }),
    prisma.supportTicket.count({ where: { status: { in: ["open", "in_progress"] } } }),
    prisma.booking.aggregate({
      where: { paymentStatus: "paid" },
      _sum: { totalCost: true },
    }),
  ]);

  res.json({
    data: {
      users: { total: totalUsers },
      bookings: { active: activeBookings, pending: pendingBookings },
      vehicles: { available: availableVehicles, total: totalVehicles },
      repairs: { pending: pendingRepairs },
      sales: { active: activeListings, pending: pendingListings },
      support: { open: openTickets },
      revenue: { total: Number(revenueAgg._sum.totalCost ?? 0) },
      // Flat aliases so mobile + admin web can share a single client shape.
      totalUsers,
      totalVehicles,
      totalBookings: activeBookings + pendingBookings,
      pendingBookings,
      pendingListings,
      openTickets,
      monthlyRevenue: Number(revenueAgg._sum.totalCost ?? 0),
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
  const limitNum = Math.min(PAGINATION.max, Math.max(1, Number(limit)));

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
  const { body } = createCustomerNoteSchema.parse(req.body);
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
        idFrontUrl: true,
        idBackUrl: true,
        idVerified: true,
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
  const limitNum = Math.min(PAGINATION.max, Math.max(1, Number(limit)));

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

// One conversation's full thread, for the admin web inbox detail view.
// Participants carry accountType so the UI can tell customer from team.
router.get("/conversations/:id", async (req, res) => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: req.params.id },
    include: {
      participants: {
        include: {
          user: {
            select: { id: true, name: true, email: true, phone: true, accountType: true },
          },
        },
      },
      messages: { orderBy: { createdAt: "asc" }, take: 200 },
    },
  });
  if (!conversation) {
    res.status(404).json({ message: "Conversation not found" });
    return;
  }
  res.json({ data: conversation });
});

// Admin/staff reply into a conversation from the web inbox. Posts to the
// conversation's customer participant, reusing the Message model + the same
// customer notification path as a mobile reply.
router.post("/conversations/:id/reply", async (req, res) => {
  const message = String((req.body as { message?: unknown })?.message ?? "").trim();
  if (!message) {
    res.status(400).json({ message: "Message required" });
    return;
  }
  if (message.length > 2000) {
    res.status(400).json({ message: "Message too long" });
    return;
  }
  const conversation = await prisma.conversation.findUnique({
    where: { id: req.params.id },
    include: { participants: { include: { user: { select: { id: true, accountType: true } } } } },
  });
  if (!conversation) {
    res.status(404).json({ message: "Conversation not found" });
    return;
  }
  const customer = conversation.participants.find((p) => p.user?.accountType === "customer");
  if (!customer) {
    res.status(400).json({ message: "No customer participant in this conversation" });
    return;
  }
  const senderId = req.user!.userId;
  const created = await prisma.message.create({
    data: { senderId, recipientId: customer.userId, conversationId: conversation.id, message },
  });
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: new Date() },
  });
  const io = getIO();
  if (io) io.of("/messages").to(`user:${customer.userId}`).emit("message:new", created);
  await notifyUser(customer.userId, `message-${created.id}`, {
    type: "message_new",
    title: "Support",
    body: message.slice(0, 140),
    data: {
      conversationId: conversation.id,
      messageId: created.id,
      url: `/messages/${conversation.id}`,
    },
  });
  res.status(201).json({ data: created });
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
