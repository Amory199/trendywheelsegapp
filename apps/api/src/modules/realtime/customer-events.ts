// Real-time customer-activity broadcaster.
//
// Whenever a customer writes (booking, sale listing, repair, maintenance,
// pickup-delivery, customization, signup), we emit a `customer.*` event on
// the /admin Socket.IO namespace so admin (and sales) tabs invalidate their
// React Query caches immediately — no manual pull-to-refresh.
//
// All emits are fire-and-forget. If the IO server isn't ready (boot,
// unit tests) the function is a no-op.

import { getIO } from "../../utils/io-registry.js";
import { logger } from "../../utils/logger.js";

export type CustomerEventType =
  | "booking.created"
  | "booking.updated"
  | "sales-listing.created"
  | "sales-listing.updated"
  | "repair.created"
  | "repair.updated"
  | "maintenance.created"
  | "pickup.created"
  | "customization.created"
  | "customer.signup"
  | "rental-listing.created"
  | "rental-listing.updated"
  | "reservation.created"
  | "reservation.updated"
  | "order.updated";

interface CustomerEventPayload {
  id: string;
  userId: string;
  at: string;
  meta?: Record<string, unknown>;
}

export function emitCustomerEvent(type: CustomerEventType, payload: CustomerEventPayload): void {
  const io = getIO();
  if (!io) return;
  try {
    // Single namespace, single channel — clients filter by event name.
    io.of("/admin").emit(`customer.${type}`, payload);
  } catch (err) {
    logger.warn({ err, type }, "customer-event emit failed");
  }
}
