import { Router, type Router as RouterType } from "express";

import { prisma } from "../../config/database.js";
import { authenticate, authorize } from "../../middleware/auth.js";

const router: RouterType = Router();

router.use(authenticate, authorize("admin", "staff"));

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
