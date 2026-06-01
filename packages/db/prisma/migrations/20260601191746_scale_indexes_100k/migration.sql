-- Scale indexes for hot customer queries at 100k users.
-- All indexes use CREATE INDEX CONCURRENTLY for zero-downtime deployment.
-- IMPORTANT: CONCURRENTLY cannot run inside a transaction; Prisma's migration
-- engine wraps each statement in its own transaction when executing migrate
-- deploy, so each CREATE INDEX CONCURRENTLY runs standalone.

-- CreateIndex: Vehicle (listingType, status) — rent flow filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS "vehicles_listing_type_status_idx" ON "vehicles"("listing_type", "status");

-- CreateIndex: Booking (userId, status) — customer booking history lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS "bookings_user_id_status_idx" ON "bookings"("user_id", "status");

-- CreateIndex: RepairRequest (userId, status) — customer repair history lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS "repair_requests_user_id_status_idx" ON "repair_requests"("user_id", "status");

-- CreateIndex: SalesListing (status, createdAt) — sales board ordering by newest active
CREATE INDEX CONCURRENTLY IF NOT EXISTS "sales_listings_status_created_at_idx" ON "sales_listings"("status", "created_at");
