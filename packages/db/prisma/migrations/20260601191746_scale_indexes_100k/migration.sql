-- Scale indexes for hot customer queries at 100k users.
--
-- NOTE: these were originally written with CREATE INDEX CONCURRENTLY, but
-- Prisma wraps each migration in a single transaction and Postgres rejects
-- CONCURRENTLY inside a transaction block (P3018 / SQLSTATE 25001), which
-- wedged `migrate deploy`. On these table sizes a plain CREATE INDEX takes
-- single-digit milliseconds, so the brief lock is a non-issue — dropped
-- CONCURRENTLY. IF NOT EXISTS keeps it idempotent if any index was created
-- out-of-band. Revisit with a CONCURRENTLY backfill only if a table grows
-- large enough that the build lock matters.

-- CreateIndex: Vehicle (listingType, status) — rent flow filtering
CREATE INDEX IF NOT EXISTS "vehicles_listing_type_status_idx" ON "vehicles"("listing_type", "status");

-- CreateIndex: Booking (userId, status) — customer booking history lookups
CREATE INDEX IF NOT EXISTS "bookings_user_id_status_idx" ON "bookings"("user_id", "status");

-- CreateIndex: RepairRequest (userId, status) — customer repair history lookups
CREATE INDEX IF NOT EXISTS "repair_requests_user_id_status_idx" ON "repair_requests"("user_id", "status");

-- CreateIndex: SalesListing (status, createdAt) — sales board ordering by newest active
CREATE INDEX IF NOT EXISTS "sales_listings_status_created_at_idx" ON "sales_listings"("status", "created_at");
