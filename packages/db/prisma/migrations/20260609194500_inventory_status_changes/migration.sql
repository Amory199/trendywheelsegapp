-- v1.1 feature #3: Quick inventory toggle on mobile.
-- Extends VehicleStatus enum with `reserved` and `sold`, and creates the
-- vehicle_status_changes audit table that records who flipped a car
-- between statuses + which customer it was sold to. Feeds the v1.2
-- commission attribution model.

-- AlterEnum: VehicleStatus add reserved + sold
ALTER TYPE "VehicleStatus" ADD VALUE IF NOT EXISTS 'reserved';
ALTER TYPE "VehicleStatus" ADD VALUE IF NOT EXISTS 'sold';

-- CreateTable: vehicle_status_changes
CREATE TABLE "vehicle_status_changes" (
    "id"          UUID            NOT NULL,
    "vehicle_id"  UUID            NOT NULL,
    "from_status" "VehicleStatus" NOT NULL,
    "to_status"   "VehicleStatus" NOT NULL,
    "actor_id"    UUID            NOT NULL,
    "customer_id" UUID,
    "deal_note"   TEXT,
    "changed_at"  TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "vehicle_status_changes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vehicle_status_changes_vehicle_id_changed_at_idx"
  ON "vehicle_status_changes"("vehicle_id", "changed_at");
CREATE INDEX "vehicle_status_changes_actor_id_changed_at_idx"
  ON "vehicle_status_changes"("actor_id", "changed_at");

-- AddForeignKey
ALTER TABLE "vehicle_status_changes" ADD CONSTRAINT "vehicle_status_changes_vehicle_id_fkey"
  FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vehicle_status_changes" ADD CONSTRAINT "vehicle_status_changes_actor_id_fkey"
  FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "vehicle_status_changes" ADD CONSTRAINT "vehicle_status_changes_customer_id_fkey"
  FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
