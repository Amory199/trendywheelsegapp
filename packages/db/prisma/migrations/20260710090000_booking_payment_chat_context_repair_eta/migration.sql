-- Booking: persisted payment method (cash today, card reserved for gateway)
ALTER TABLE "bookings" ADD COLUMN "payment_method" TEXT NOT NULL DEFAULT 'cash';

-- Conversations: optional transaction context (booking-scoped chat threads)
ALTER TABLE "conversations" ADD COLUMN "context_type" TEXT;
ALTER TABLE "conversations" ADD COLUMN "context_id" UUID;
ALTER TABLE "conversations" ADD COLUMN "context_title" TEXT;
CREATE INDEX "conversations_context_type_context_id_idx" ON "conversations"("context_type", "context_id");

-- Repairs: staff-set expected completion time (customer-facing ETA)
ALTER TABLE "repair_requests" ADD COLUMN "eta_at" TIMESTAMP(3);
