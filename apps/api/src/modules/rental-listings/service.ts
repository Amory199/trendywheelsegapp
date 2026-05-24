import type { Prisma } from "@prisma/client";

import { prisma } from "../../config/database.js";
import { emitDomainEvent, notifyAdmins, notifyUser } from "../../utils/notify.js";

export async function createRentalListing(
  userId: string,
  data: Omit<Prisma.RentalListingUncheckedCreateInput, "userId">,
): Promise<Prisma.RentalListingGetPayload<true>> {
  const created = await prisma.rentalListing.create({
    data: { ...data, userId },
  });

  emitDomainEvent("rental-listing.created", created.id, userId, {
    brand: created.brand,
    model: created.model,
    year: created.year,
  });

  await notifyAdmins(`rental-listing-submitted-${created.id}`, {
    type: "rental_listing_submitted",
    title: "New rental listing submitted",
    body: `${created.brand} ${created.model} (${created.year}) — needs review`,
    data: { rentalListingId: created.id, userId },
  });

  return created;
}

export async function transitionRentalListing(
  id: string,
  data: Prisma.RentalListingUpdateInput,
  reviewerId?: string,
): Promise<Prisma.RentalListingGetPayload<true>> {
  const patch: Prisma.RentalListingUpdateInput = { ...data };
  if (reviewerId && data.status) {
    patch.reviewedBy = { connect: { id: reviewerId } };
    patch.reviewedAt = new Date();
  }
  const updated = await prisma.rentalListing.update({ where: { id }, data: patch });

  emitDomainEvent("rental-listing.updated", updated.id, updated.userId, {
    status: updated.status,
  });

  // Notify owner on consequential transitions.
  if (data.status === "approved" || data.status === "declined") {
    const isApproved = data.status === "approved";
    await notifyUser(updated.userId, `rental-listing-${updated.status}-${updated.id}`, {
      type: isApproved ? "rental_listing_approved" : "rental_listing_declined",
      title: isApproved ? "Your rental listing was approved" : "Your rental listing was declined",
      body: `${updated.brand} ${updated.model} (${updated.year})${
        !isApproved && updated.declineReason ? ` — ${updated.declineReason}` : ""
      }`,
      data: { rentalListingId: updated.id },
    });
  }

  return updated;
}
