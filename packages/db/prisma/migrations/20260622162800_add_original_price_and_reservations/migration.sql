-- Track A: before/after sale pricing on vehicles + reserve/buy intents on for-sale vehicles.

-- "Before" price (struck through in the app) alongside the existing sale_price ("after").
ALTER TABLE "vehicles" ADD COLUMN "original_price_egp" DECIMAL(12,2);

-- Reservation = a reserve/buy hold on a FOR-SALE vehicle (vs Booking = date-ranged rental).
-- id_front_url / id_back_url snapshot the customer's ID at reservation time (Track C).
CREATE TYPE "ReservationStatus" AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');

CREATE TABLE "reservations" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'pending',
    "amount_egp" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "id_front_url" TEXT,
    "id_back_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "reservations_user_id_idx" ON "reservations"("user_id");
CREATE INDEX "reservations_vehicle_id_idx" ON "reservations"("vehicle_id");
CREATE INDEX "reservations_status_idx" ON "reservations"("status");

ALTER TABLE "reservations" ADD CONSTRAINT "reservations_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_vehicle_id_fkey"
    FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
