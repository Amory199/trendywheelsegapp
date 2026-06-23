import type { Request, Response } from "express";

import { createReservationSchema, updateReservationSchema } from "@trendywheels/validators";

import { prisma } from "../../config/database.js";
import { isAdmin } from "../../utils/auth-roles.js";
import { AppError } from "../../utils/errors.js";

import { createReservation, setReservationStatus } from "./service.js";

// POST /api/reservations — a customer reserves/buys a for-sale vehicle.
export async function create(req: Request, res: Response): Promise<void> {
  const input = createReservationSchema.parse(req.body);
  const created = await createReservation(
    req.user!.userId,
    input.vehicleId,
    input.notes,
    input.dropoffLocationUrl,
    input.fulfillmentType,
  );
  res.status(201).json({ data: created });
}

// GET /api/reservations — admins see all; customers see only their own.
export async function list(req: Request, res: Response): Promise<void> {
  const where = isAdmin(req.user) ? {} : { userId: req.user!.userId };
  const items = await prisma.reservation.findMany({
    where,
    include: {
      vehicle: true,
      user: { select: { id: true, name: true, email: true, phone: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  res.json({ data: items });
}

// PATCH /api/reservations/:id — admin-only status transitions.
export async function update(req: Request, res: Response): Promise<void> {
  const existing = await prisma.reservation.findUnique({ where: { id: req.params.id } });
  if (!existing) throw AppError.notFound("Reservation not found");
  const input = updateReservationSchema.parse(req.body);
  const updated = await setReservationStatus(req.params.id, input.status);
  res.json({ data: updated });
}
