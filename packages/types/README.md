# @trendywheels/types

Shared **domain TypeScript types**. The User, Booking, Vehicle, Lead,
SupportTicket, LoyaltyTier — every concept the API exposes lives here as a
TS interface or string-union.

## What it owns

- Entity types: `User`, `Vehicle`, `Booking`, `SalesListing`, `RepairRequest`,
  `SupportTicket`, `Lead`, `Notification`, `Message`.
- Status / role unions: `BookingStatus`, `RepairStatus`, `TicketStatus`,
  `LoyaltyTier`, `AccountType`.
- Filter shapes: `VehicleFilters`, `BookingFilters`.
- Generic response envelopes: `ApiResponse<T>`, `PaginatedResponse<T>`.

## When to use

- Any frontend or backend file that handles one of these entities. Import
  the canonical type instead of redeclaring `interface Lead { … }` per
  screen — the audit found ≥6 redeclarations of the same shape.

## When NOT to use

- Don't put runtime Zod schemas here. That's `@trendywheels/validators`.
- Don't put UI tokens (colors, statuses → display tone) here. That's
  `@trendywheels/ui-tokens`.
- Don't put backend-only types (Prisma payloads, queue job shapes) — keep
  those local to `apps/api/src/types/`.

## Rule of thumb

If a type is named after a database table or an API URL segment, it
probably belongs here.
