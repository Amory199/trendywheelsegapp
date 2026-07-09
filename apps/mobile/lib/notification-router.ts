// Tap-dispatch for push notifications. The server worker stamps every push
// `data` payload with `{ type, notificationId, ...ids }` (see
// apps/api/src/workers/index.ts:141). We switch on `type` and pick a route,
// optionally branching by role so admin taps land in /admin/* and sales taps
// stay in /crm/*.
//
// Returns the route string if we could resolve one, or null when the type is
// unknown / required id is missing. Callers (_layout.tsx) navigate via
// router.push on a non-null return.

import type { User } from "@trendywheels/types";

type Role = "admin" | "sales" | "customer" | "other";

function roleFor(user: User | null): Role {
  if (!user) return "other";
  if (user.accountType === "admin" || user.staffRole === "admin") return "admin";
  if (user.staffRole === "sales") return "sales";
  if (user.accountType === "customer") return "customer";
  return "other";
}

export function routeNotification(
  data: Record<string, unknown> | null | undefined,
  user: User | null,
): string | null {
  if (!data || typeof data.type !== "string") return null;
  const role = roleFor(user);
  const type = data.type;
  const leadId = typeof data.leadId === "string" ? data.leadId : null;
  const bookingId = typeof data.bookingId === "string" ? data.bookingId : null;
  const repairId =
    (typeof data.repairRequestId === "string" && data.repairRequestId) ||
    (typeof data.repairId === "string" && data.repairId) ||
    null;
  const conversationId = typeof data.conversationId === "string" ? data.conversationId : null;
  const requestId = typeof data.requestId === "string" ? data.requestId : null;
  const listingId = typeof data.listingId === "string" ? data.listingId : null;
  const userId = typeof data.userId === "string" ? data.userId : null;

  switch (type) {
    case "lead_assigned":
    case "lead_reassigned":
    case "lead_escalation":
    case "lead_inactive":
      if (!leadId) return null;
      return role === "admin" ? `/admin/leads/${leadId}` : `/crm/leads/${leadId}`;

    case "booking_pending":
      return bookingId ? `/admin/bookings/${bookingId}` : null;
    case "booking_approved":
    case "booking_rejected":
      return bookingId ? `/bookings/${bookingId}` : null;

    case "repair_status":
      if (!repairId) return null;
      return role === "admin" || role === "sales"
        ? `/admin/repairs/${repairId}`
        : `/repair/${repairId}`;

    case "message_new":
      return conversationId ? `/messages/${conversationId}` : null;

    case "service_request_maintenance":
    case "service_request_pickup":
    case "service_request_customization":
      return requestId ? `/admin/service-requests/${requestId}` : null;

    case "listing_pending":
    case "sales_listing_created":
      return listingId ? `/admin/sales/${listingId}` : null;

    case "customer_signup":
      return userId ? `/admin/users/${userId}` : null;

    // Manual-OTP request: an admin tap lands in the inbox to issue a code.
    case "otp_request":
      return role === "admin" ? "/admin/otp-requests" : null;

    // New fleet listing announced to customers — open the listing itself,
    // on the sale or rent detail screen depending on how it's listed.
    case "new_listing": {
      const vehicleId = typeof data.vehicleId === "string" ? data.vehicleId : null;
      if (!vehicleId) return null;
      const listingType = typeof data.listingType === "string" ? data.listingType : "rent";
      return listingType === "sale" || listingType === "both"
        ? `/sale/${vehicleId}`
        : `/rent/${vehicleId}`;
    }

    default:
      return null;
  }
}
