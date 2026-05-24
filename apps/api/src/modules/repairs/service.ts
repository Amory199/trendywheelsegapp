// Repairs — service layer. Status-transition logic that lives outside the
// controller so workers (auto-assignment sweeps, escalation jobs) can call
// the same transition path without re-implementing the event + notification
// fan-out.

import { prisma } from "../../config/database.js";
import { AppError } from "../../utils/errors.js";
import { emitDomainEvent, notifyUser } from "../../utils/notify.js";

// DB-side enum value. Controllers translate API kebab-case ↔ DB snake_case.
export type RepairDbStatus = "submitted" | "assigned" | "in_progress" | "completed" | "cancelled";

/**
 * Transition a repair to the next status, emit the realtime event, and push
 * a notification to the owning customer. Returns the updated row (raw DB
 * shape — callers translate to API shape).
 */
export async function transitionRepair(
  id: string,
  nextStatus: RepairDbStatus,
  extra: Record<string, unknown> = {},
): Promise<Awaited<ReturnType<typeof prisma.repairRequest.update>>> {
  const repair = await prisma.repairRequest.findUnique({ where: { id } });
  if (!repair) throw AppError.notFound("Repair request not found");

  const updated = await prisma.repairRequest.update({
    where: { id },
    data: { status: nextStatus, ...extra } as never,
    include: { vehicle: { select: { name: true } }, user: { select: { id: true } } },
  });

  emitDomainEvent("repair.updated", id, updated.user.id, { status: nextStatus });

  await notifyUser(updated.user.id, `repair-${id}-${nextStatus}`, {
    type: "repair_status",
    title: "Repair update",
    body: `Your ${updated.vehicle?.name ?? "vehicle"} repair is now ${nextStatus.replace("_", " ")}.`,
    data: { repairId: id, status: nextStatus },
  });

  return updated;
}
