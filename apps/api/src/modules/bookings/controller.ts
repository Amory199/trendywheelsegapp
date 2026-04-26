import type { Request, Response } from "express";

import { prisma } from "../../config/database.js";
import { AppError } from "../../utils/errors.js";
import { recordActivity } from "../crm/service.js";

export async function list(req: Request, res: Response): Promise<void> {
  const { status, userId, vehicleId, page = 1, limit = 20 } = req.query as Record<string, string>;
  const pageNum = Number(page);
  const limitNum = Number(limit);

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (userId) where.userId = userId;
  if (vehicleId) where.vehicleId = vehicleId;

  // Customers can only see their own bookings
  if (req.user!.accountType === "customer") {
    where.userId = req.user!.userId;
  }

  const [data, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      include: { vehicle: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.booking.count({ where }),
  ]);

  res.json({ data, total, page: pageNum, limit: limitNum });
}

export async function create(req: Request, res: Response): Promise<void> {
  const { vehicleId, startDate, endDate } = req.body;
  const userId = req.user!.userId;

  // Check vehicle availability
  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) throw AppError.notFound("Vehicle not found");
  if (vehicle.status !== "available") throw AppError.conflict("Vehicle is not available");

  // Check for overlapping bookings
  const overlap = await prisma.booking.findFirst({
    where: {
      vehicleId,
      status: "confirmed",
      startDate: { lte: new Date(endDate) },
      endDate: { gte: new Date(startDate) },
    },
  });
  if (overlap) throw AppError.conflict("Vehicle is already booked for these dates");

  // Calculate total cost
  const days = Math.ceil(
    (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24),
  );
  const totalCost = Number(vehicle.dailyRate) * Math.max(days, 1);

  const booking = await prisma.booking.create({
    data: {
      userId,
      vehicleId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      totalCost,
      status: "confirmed",
      paymentStatus: "pending",
    },
  });

  // Increment vehicle booking count
  await prisma.vehicle.update({
    where: { id: vehicleId },
    data: { totalBookings: { increment: 1 } },
  });

  // Update CRM lead — bump value, mark contacted, log activity.
  const lead = await prisma.lead.findUnique({ where: { customerId: userId } });
  if (lead) {
    const nextStatus = lead.status === "new" ? "qualified" : lead.status;
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        estimatedValue: { increment: totalCost },
        status: nextStatus,
        lastActivityAt: new Date(),
      },
    });
    await recordActivity(
      lead.id,
      null,
      "note",
      `Booked ${vehicle.name} for ${days} day${days === 1 ? "" : "s"} (EGP ${totalCost.toLocaleString()})`,
    );
  }

  res.status(201).json({ data: booking, id: booking.id });
}

export async function update(req: Request, res: Response): Promise<void> {
  const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
  if (!booking) throw AppError.notFound("Booking not found");

  // Customers can only modify their own bookings
  if (req.user!.accountType === "customer" && booking.userId !== req.user!.userId) {
    throw AppError.forbidden();
  }

  const updated = await prisma.booking.update({
    where: { id: req.params.id },
    data: req.body,
  });

  res.json({ data: updated });
}

const STAFF_TYPES = new Set(["admin", "staff"]);

export async function cancel(req: Request, res: Response): Promise<void> {
  const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
  if (!booking) throw AppError.notFound("Booking not found");
  if (!STAFF_TYPES.has(req.user!.accountType) && booking.userId !== req.user!.userId) {
    throw AppError.forbidden();
  }
  const wasPaid = booking.paymentStatus === "paid";
  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: "cancelled",
      paymentStatus: wasPaid ? "refunded" : booking.paymentStatus,
    },
  });
  res.json({ data: updated });
}

export async function markPaid(req: Request, res: Response): Promise<void> {
  if (!STAFF_TYPES.has(req.user!.accountType)) throw AppError.forbidden();
  const updated = await prisma.booking.update({
    where: { id: req.params.id },
    data: { paymentStatus: "paid" },
  });
  res.json({ data: updated });
}

export async function refund(req: Request, res: Response): Promise<void> {
  if (!STAFF_TYPES.has(req.user!.accountType)) throw AppError.forbidden();
  const updated = await prisma.booking.update({
    where: { id: req.params.id },
    data: { paymentStatus: "refunded" },
  });
  res.json({ data: updated });
}

export async function remove(req: Request, res: Response): Promise<void> {
  const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
  if (!booking) throw AppError.notFound("Booking not found");

  if (req.user!.accountType === "customer" && booking.userId !== req.user!.userId) {
    throw AppError.forbidden();
  }

  await prisma.booking.delete({ where: { id: req.params.id } });
  res.json({ success: true });
}
