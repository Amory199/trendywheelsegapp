// Notification helpers — fold the repeated notificationsQueue.add(...) +
// emitCustomerEvent(...) shapes into single-call helpers. Every notification
// path on the API goes through here.

import { prisma } from "../config/database.js";
import { emitCustomerEvent, type CustomerEventType } from "../modules/realtime/customer-events.js";
import { notificationsQueue } from "../queues/index.js";

interface NotifyPayload {
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

// Enqueue an in-app + push notification for one user.
// jobIdPrefix should be unique per logical event so BullMQ can dedupe retries.
export async function notifyUser(
  userId: string,
  jobIdPrefix: string,
  payload: NotifyPayload,
): Promise<void> {
  await notificationsQueue.add(
    `${jobIdPrefix}-${userId}`,
    { userId, ...payload },
    { removeOnComplete: 100, removeOnFail: 50 },
  );
}

// Notify every active admin/staff user — used by signup, sales-listing
// creation, broadcasts, etc. Pass { adminOnly: true } to reach only true admins
// (not staff) — e.g. manual-OTP requests, which only admins can action.
export async function notifyAdmins(
  jobIdPrefix: string,
  payload: NotifyPayload,
  opts?: { adminOnly?: boolean },
): Promise<void> {
  const admins = await prisma.user.findMany({
    where: {
      accountType: opts?.adminOnly ? "admin" : { in: ["admin", "staff"] },
      status: "active",
    },
    select: { id: true },
  });
  await Promise.all(admins.map((a) => notifyUser(a.id, jobIdPrefix, payload)));
}

// Notify every active customer — used for new-listing announcements. These
// are marketing-tier pushes: the worker's fatigue cap and the user's push
// preference both apply (the type must NOT be in CRITICAL_PUSH_TYPES).
export async function notifyCustomers(jobIdPrefix: string, payload: NotifyPayload): Promise<void> {
  const customers = await prisma.user.findMany({
    where: { accountType: "customer", status: "active" },
    select: { id: true },
  });
  await Promise.all(customers.map((c) => notifyUser(c.id, jobIdPrefix, payload)));
}

// Broadcast a customer-activity event on the /admin Socket.IO namespace and
// stamp the standard `{id, userId, at}` envelope. Returns nothing — fire and
// forget like the underlying emitter.
export function emitDomainEvent(
  type: CustomerEventType,
  entityId: string,
  userId: string,
  meta?: Record<string, unknown>,
): void {
  emitCustomerEvent(type, {
    id: entityId,
    userId,
    at: new Date().toISOString(),
    meta,
  });
}
