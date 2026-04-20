import type { Request, Response } from "express";

import { prisma } from "../../config/database.js";
import { AppError } from "../../utils/errors.js";

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

export async function remove(req: Request, res: Response): Promise<void> {
  const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
  if (!booking) throw AppError.notFound("Booking not found");

  if (req.user!.accountType === "customer" && booking.userId !== req.user!.userId) {
    throw AppError.forbidden();
  }

  await prisma.booking.delete({ where: { id: req.params.id } });
  res.json({ success: true });
}
