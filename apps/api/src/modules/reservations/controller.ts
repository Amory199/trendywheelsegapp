import type { Request, Response } from "express";

import { createReservationSchema, updateReservationSchema } from "@trendywheels/validators";

import { prisma } from "../../config/database.js";
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

// GET /api/reservations — staff see all; customers see only their own. Staff
// approve/reject was explicitly enabled by the owner, so they need the full
// board to act on: an admin-only list would make the widened PATCH unusable.
export async function list(req: Request, res: Response): Promise<void> {
  // Allow-list, not deny-list: name the roles that may see the whole board and
  // scope everyone else to their own rows. Keying off `isCustomer` instead would
  // fail OPEN — any account type that isn't literally "customer" (a future role,
  // or a token missing the claim) would read every customer's contact details.
  const isStaff = req.user?.accountType === "admin" || req.user?.accountType === "staff";
  const where = isStaff ? {} : { userId: req.user!.userId };
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

// PATCH /api/reservations/:id — status transitions (admin + staff, widened by
// the owner so staff can work the approvals board).
export async function update(req: Request, res: Response): Promise<void> {
  const existing = await prisma.reservation.findUnique({ where: { id: req.params.id } });
  if (!existing) throw AppError.notFound("Reservation not found");
  const input = updateReservationSchema.parse(req.body);
  const updated = await setReservationStatus(req.params.id, input.status);
  res.json({ data: updated });
}
