-- Repurpose VehicleType from a seat-count (4-seater / 6-seater / LED, which
-- duplicated the seating field) to a real vehicle kind: off-road / on-road /
-- utility / luxury. type is now nullable/optional, and the existing rows are
-- cleared so the owner can set each vehicle's kind afresh.

-- 1. Allow NULL (type was NOT NULL).
ALTER TABLE "vehicles" ALTER COLUMN "type" DROP NOT NULL;

-- 2. Swap the enum type. Postgres can't drop/rename enum members in place, so
--    rename the old type out of the way, create the new one, migrate the column
--    (clearing every existing value to NULL), then drop the old type.
ALTER TYPE "VehicleType" RENAME TO "VehicleType_old";
CREATE TYPE "VehicleType" AS ENUM ('off-road', 'on-road', 'utility', 'luxury');
ALTER TABLE "vehicles"
  ALTER COLUMN "type" TYPE "VehicleType" USING (NULL::"VehicleType");
DROP TYPE "VehicleType_old";
