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
