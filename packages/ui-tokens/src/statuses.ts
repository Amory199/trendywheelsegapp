// Status-pill color tokens. Each status maps to a `{ bg, fg }` pair suitable
// for both React Native (Text + View backgroundColor) and web (CSS background/
// color on a span). Centralised here so the booking/repair/listing/ticket
// chips look the same on every screen — and changing one tone takes one edit
// instead of six.

import type { BookingStatus, RepairStatus, TicketStatus } from "@trendywheels/types";

export interface StatusTone {
  bg: string;
  fg: string;
}

// SalesListing.status in @trendywheels/types is narrow ("active" | "sold" |
// "pending"), but the customer-web my-listings page legitimately surfaces
// "withdrawn" and "paused" as well — both are real backend states. Define a
// wider union here so consumers don't have to invent their own.
export type SalesListingStatus = "pending" | "active" | "sold" | "withdrawn" | "paused";

export const BOOKING_STATUS_TONE: Record<BookingStatus, StatusTone> = {
  pending: { bg: "#FFF4D6", fg: "#806000" },
  confirmed: { bg: "#E6F8E6", fg: "#0A6B0A" },
  completed: { bg: "#E6F0FF", fg: "#1338A8" },
  cancelled: { bg: "#FCE7E7", fg: "#A21F1F" },
};

export const REPAIR_STATUS_TONE: Record<RepairStatus, StatusTone> = {
  submitted: { bg: "#E6F0FF", fg: "#1338A8" },
  assigned: { bg: "#F0E5FF", fg: "#5300A8" },
  "in-progress": { bg: "#FFF4D6", fg: "#806000" },
  completed: { bg: "#E6F8E6", fg: "#0A6B0A" },
  cancelled: { bg: "#FCE7E7", fg: "#A21F1F" },
};

export const LISTING_STATUS_TONE: Record<SalesListingStatus, StatusTone> = {
  pending: { bg: "#FFF4D6", fg: "#806000" },
  active: { bg: "#E6F8E6", fg: "#0A6B0A" },
  sold: { bg: "#E6F0FF", fg: "#1338A8" },
  withdrawn: { bg: "#F1F1F1", fg: "#5B5B5B" },
  paused: { bg: "#F0E5FF", fg: "#5300A8" },
};

export const TICKET_STATUS_TONE: Record<TicketStatus, StatusTone> = {
  open: { bg: "#FFF4D6", fg: "#806000" },
  "in-progress": { bg: "#F0E5FF", fg: "#5300A8" },
  resolved: { bg: "#E6F8E6", fg: "#0A6B0A" },
  closed: { bg: "#F1F1F1", fg: "#5B5B5B" },
};

// Tailwind-class siblings of the *_TONE maps. The admin / support / inventory
// dashboards style their status chips with utility classes instead of inline
// styles, so they need the same logical token expressed in `bg-... text-...`
// form. Keep these in lockstep with the *_TONE hex values when a status hue
// changes.
//
// The "amber" tone uses bg-yellow-100 to match the warmer warning hue used by
// existing dashboards (Tailwind's `amber-*` is more orange than the spec
// design tokens called for, and we've shipped `yellow-*` everywhere already).
const WARN_CLASS = "bg-yellow-100 text-yellow-700";
const SUCCESS_CLASS = "bg-green-100 text-green-700";
const INFO_CLASS = "bg-blue-100 text-blue-700";
const DANGER_CLASS = "bg-red-100 text-red-700";
const PURPLE_CLASS = "bg-purple-100 text-purple-700";
const MUTED_CLASS = "bg-gray-100 text-gray-600";

export const BOOKING_STATUS_CLASS: Record<BookingStatus, string> = {
  pending: WARN_CLASS,
  confirmed: SUCCESS_CLASS,
  completed: INFO_CLASS,
  cancelled: DANGER_CLASS,
};

export const REPAIR_STATUS_CLASS: Record<RepairStatus, string> = {
  submitted: INFO_CLASS,
  assigned: PURPLE_CLASS,
  "in-progress": WARN_CLASS,
  completed: SUCCESS_CLASS,
  cancelled: DANGER_CLASS,
};

export const LISTING_STATUS_CLASS: Record<SalesListingStatus, string> = {
  pending: WARN_CLASS,
  active: SUCCESS_CLASS,
  sold: INFO_CLASS,
  withdrawn: MUTED_CLASS,
  paused: PURPLE_CLASS,
};

export const TICKET_STATUS_CLASS: Record<TicketStatus, string> = {
  open: WARN_CLASS,
  "in-progress": PURPLE_CLASS,
  resolved: SUCCESS_CLASS,
  closed: MUTED_CLASS,
};
