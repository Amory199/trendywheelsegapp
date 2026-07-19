-- Staff fulfilment pipeline: an explicit stage on bookings and orders that staff
-- advance from the inbox. The legacy status/paymentStatus columns stay
-- authoritative — stage is a label over them, never a second source of truth.
ALTER TABLE "bookings" ADD COLUMN "stage" TEXT NOT NULL DEFAULT 'requested';
ALTER TABLE "orders" ADD COLUMN "stage" TEXT NOT NULL DEFAULT 'requested';

-- Backfill history to where each row ACTUALLY is. Leaving everything at
-- 'requested' would park finished and cancelled deals at the head of a live
-- pipeline, inviting staff to walk a completed rental forward again. Most
-- specific state first — later UPDATEs must not clobber earlier ones.
UPDATE "bookings" SET "stage" = 'approved'          WHERE "status" = 'confirmed';
UPDATE "bookings" SET "stage" = 'payment_collected' WHERE "status" = 'confirmed' AND "payment_status" = 'paid';
UPDATE "bookings" SET "stage" = 'handed_over'       WHERE "status" = 'confirmed' AND "checked_in_at" IS NOT NULL;
-- Terminal rows: the handlers refuse to move a completed/cancelled booking at
-- all, so the stage here is purely descriptive.
UPDATE "bookings" SET "stage" = 'returned'          WHERE "status" = 'completed';

UPDATE "orders" SET "stage" = 'payment_collected' WHERE "status" = 'paid';
UPDATE "orders" SET "stage" = 'delivered'         WHERE "status" IN ('shipped', 'delivered');

-- The staff inbox filters on stage.
CREATE INDEX "bookings_stage_idx" ON "bookings"("stage");
CREATE INDEX "orders_stage_idx" ON "orders"("stage");

-- Entity-agnostic timeline (no FK) so bookings and orders share one table.
CREATE TABLE "stage_events" (
    "id" UUID NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "stage" TEXT NOT NULL,
    "note" TEXT,
    "actor_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stage_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "stage_events_entity_type_entity_id_idx" ON "stage_events"("entity_type", "entity_id");
