import type { Prisma } from "@prisma/client";

import { prisma } from "../../config/database.js";
import { AppError } from "../../utils/errors.js";
import { emitDomainEvent, notifyAdmins, notifyUser } from "../../utils/notify.js";

// Create a reserve/buy hold on a FOR-SALE vehicle. Snapshots the customer's ID
// (front/back) onto the reservation at creation — every transaction must carry
// who reserved it (Track C). The amount is the vehicle's current sale price.
export async function createReservation(
  userId: string,
  vehicleId: string,
  notes?: string | null,
  dropoffLocationUrl?: string | null,
): Promise<Prisma.ReservationGetPayload<{ include: { vehicle: true } }>> {
  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) throw AppError.notFound("Vehicle not found");
  if (vehicle.listingType === "rent" || vehicle.salePrice == null) {
    throw AppError.badRequest("This vehicle is not for sale");
  }

  // Snapshot the customer's verified ID (front/back) onto the reservation so
  // the record carries who reserved it, even if they later change their docs.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { idFrontUrl: true, idBackUrl: true },
  });

  const created = await prisma.reservation.create({
    data: {
      userId,
      vehicleId,
      amountEgp: vehicle.salePrice,
      notes: notes ?? null,
      dropoffLocationUrl: dropoffLocationUrl ?? null,
      idFrontUrl: user?.idFrontUrl ?? null,
      idBackUrl: user?.idBackUrl ?? null,
    },
    include: { vehicle: true },
  });

  emitDomainEvent("reservation.created", created.id, userId, {
    vehicleId,
    amountEgp: created.amountEgp.toString(),
  });

  await notifyAdmins(`reservation-created-${created.id}`, {
    type: "reservation_created",
    title: "New vehicle reservation",
    body: `${vehicle.name} — reserved, needs follow-up`,
    data: { reservationId: created.id, userId, vehicleId },
  });

  return created;
}

export async function setReservationStatus(
  id: string,
  status: "pending" | "confirmed" | "completed" | "cancelled",
): Promise<Prisma.ReservationGetPayload<{ include: { vehicle: true } }>> {
  const updated = await prisma.reservation.update({
    where: { id },
    data: { status },
    include: { vehicle: true },
  });

  emitDomainEvent("reservation.updated", updated.id, updated.userId, { status });

  if (status === "confirmed" || status === "cancelled") {
    await notifyUser(updated.userId, `reservation-${status}-${updated.id}`, {
      type: status === "confirmed" ? "reservation_confirmed" : "reservation_cancelled",
      title:
        status === "confirmed" ? "Your reservation is confirmed" : "Your reservation was cancelled",
      body: updated.vehicle.name,
      data: { reservationId: updated.id },
    });
  }

  return updated;
}
