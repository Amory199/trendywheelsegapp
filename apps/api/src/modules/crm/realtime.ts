// Real-time emit helpers for CRM events. Pushes through the existing /admin
// Socket.IO namespace (defined in src/sockets/index.ts) so the admin app can
// invalidate its React Query caches the instant a sales agent acts.
//
// All emits are fire-and-forget — never await, never throw upstream. If the
// IO server isn't ready (e.g. during boot or in unit tests), emit is a no-op.

import { getIO } from "../../utils/io-registry.js";
import { logger } from "../../utils/logger.js";

interface LeadEventPayload {
  leadId: string;
  actorId: string | null;
  at: string; // ISO timestamp
  ownerId?: string | null;
  previousOwnerId?: string | null;
  status?: string;
  type?: string; // activity type, when applicable
}

function emit(event: string, payload: LeadEventPayload): void {
  const io = getIO();
  if (!io) return;
  try {
    io.of("/admin").emit(event, payload);
  } catch (err) {
    logger.warn({ err, event }, "CRM realtime emit failed");
  }
}

export function emitLeadActivity(leadId: string, actorId: string | null, type: string): void {
  emit("lead.activity", { leadId, actorId, type, at: new Date().toISOString() });
}

export function emitLeadAssigned(leadId: string, actorId: string | null, ownerId: string): void {
  emit("lead.assigned", { leadId, actorId, ownerId, at: new Date().toISOString() });
}

export function emitLeadRotated(
  leadId: string,
  actorId: string | null,
  ownerId: string | null,
  previousOwnerId: string | null,
): void {
  emit("lead.rotated", {
    leadId,
    actorId,
    ownerId,
    previousOwnerId,
    at: new Date().toISOString(),
  });
}

export function emitLeadInactive(leadId: string, actorId: string | null): void {
  emit("lead.inactive", {
    leadId,
    actorId,
    status: "inactive",
    at: new Date().toISOString(),
  });
}

export function emitLeadUpdated(leadId: string, actorId: string | null, status?: string): void {
  emit("lead.updated", { leadId, actorId, status, at: new Date().toISOString() });
}
