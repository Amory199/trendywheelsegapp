// Users — service layer. The big extraction here is `buildCustomerTimeline`:
// fans out to 8 tables and merges into a chronological timeline. Lives
// outside the controller so it can be reused by reports / CSV exports later.

import { prisma } from "../../config/database.js";
import { AppError } from "../../utils/errors.js";

// Per-category cap on rows folded into the timeline. Big enough to surface a
// year of activity for an engaged customer, small enough that a power-user
// account can't blow up the response.
const TIMELINE_ROWS_PER_CATEGORY = 50;
const LEAD_ACTIVITY_CAP = 100;

export interface TimelineRow {
  at: string;
  kind:
    | "signup"
    | "booking"
    | "repair"
    | "sales-listing"
    | "maintenance"
    | "customization"
    | "pickup"
    | "lead-activity";
  entityId: string;
  summary: string;
  meta?: Record<string, unknown>;
}

export interface CustomerTimeline {
  user: { id: string; name: string | null; phone: string; email: string | null };
  rows: TimelineRow[];
}

export async function buildCustomerTimeline(userId: string): Promise<CustomerTimeline> {
  // Fetch in parallel — each query is small (per-user).
  const [user, bookings, repairs, listings, maintenance, customization, transport, leadActivities] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, phone: true, email: true, createdAt: true },
      }),
      prisma.booking.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: TIMELINE_ROWS_PER_CATEGORY,
        include: { vehicle: { select: { name: true } } },
      }),
      prisma.repairRequest.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: TIMELINE_ROWS_PER_CATEGORY,
      }),
      prisma.salesListing.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: TIMELINE_ROWS_PER_CATEGORY,
      }),
      prisma.maintenanceRequest.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: TIMELINE_ROWS_PER_CATEGORY,
      }),
      prisma.customizationRequest.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: TIMELINE_ROWS_PER_CATEGORY,
      }),
      prisma.transportRequest.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: TIMELINE_ROWS_PER_CATEGORY,
      }),
      // Lead activities — find the lead bound to this customer, then pull its
      // activities (calls, WhatsApp, notes, status changes, rotations…).
      prisma.leadActivity.findMany({
        where: { lead: { customerId: userId } },
        orderBy: { createdAt: "desc" },
        take: LEAD_ACTIVITY_CAP,
      }),
    ]);

  if (!user) throw AppError.notFound("User not found");

  const rows: TimelineRow[] = [];
  rows.push({
    at: user.createdAt.toISOString(),
    kind: "signup",
    entityId: user.id,
    summary: `Account created${user.name ? ` — ${user.name}` : ""}`,
  });
  for (const b of bookings) {
    rows.push({
      at: b.createdAt.toISOString(),
      kind: "booking",
      entityId: b.id,
      summary: `Booked ${b.vehicle?.name ?? "vehicle"} (${b.status})`,
      meta: { status: b.status, totalCost: Number(b.totalCost) },
    });
  }
  for (const r of repairs) {
    rows.push({
      at: r.createdAt.toISOString(),
      kind: "repair",
      entityId: r.id,
      summary: `Repair request — ${r.category} (${r.status})`,
      meta: { status: r.status, priority: r.priority },
    });
  }
  for (const l of listings) {
    rows.push({
      at: l.createdAt.toISOString(),
      kind: "sales-listing",
      entityId: l.id,
      summary: `Listed for sale — ${l.title ?? "untitled"} (${l.status})`,
      meta: { status: l.status, price: Number(l.price) },
    });
  }
  for (const m of maintenance) {
    rows.push({
      at: m.createdAt.toISOString(),
      kind: "maintenance",
      entityId: m.id,
      summary: `Maintenance request — ${m.serviceType}`,
      meta: { status: m.status },
    });
  }
  for (const c of customization) {
    rows.push({
      at: c.createdAt.toISOString(),
      kind: "customization",
      entityId: c.id,
      summary: `Customization request — ${c.kind}`,
      meta: { status: c.status },
    });
  }
  for (const t of transport) {
    rows.push({
      at: t.createdAt.toISOString(),
      kind: "pickup",
      entityId: t.id,
      summary: `Pickup/delivery — ${t.fromAddress.slice(0, 30)} → ${t.toAddress.slice(0, 30)}`,
      meta: { status: t.status },
    });
  }
  for (const a of leadActivities) {
    rows.push({
      at: a.createdAt.toISOString(),
      kind: "lead-activity",
      entityId: a.id,
      summary: a.body,
      meta: { type: a.type, leadId: a.leadId },
    });
  }

  rows.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));

  return {
    user: { id: user.id, name: user.name, phone: user.phone, email: user.email },
    rows,
  };
}
