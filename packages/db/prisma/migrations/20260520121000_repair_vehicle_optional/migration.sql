-- AlterTable: repair_requests vehicle_id becomes nullable so ad-hoc repair
-- requests from the mobile flow (which has no vehicle context) stop failing
-- with a Prisma NOT NULL violation.
ALTER TABLE "repair_requests" DROP CONSTRAINT IF EXISTS "repair_requests_vehicle_id_fkey";
ALTER TABLE "repair_requests" ALTER COLUMN "vehicle_id" DROP NOT NULL;
ALTER TABLE "repair_requests"
  ADD CONSTRAINT "repair_requests_vehicle_id_fkey"
  FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
