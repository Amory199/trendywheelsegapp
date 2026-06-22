-- Customer-provided Google Maps drop-off link for delivery. NULL = store pickup.
ALTER TABLE "reservations" ADD COLUMN "dropoff_location_url" TEXT;
ALTER TABLE "orders" ADD COLUMN "dropoff_location_url" TEXT;
ALTER TABLE "bookings" ADD COLUMN "dropoff_location_url" TEXT;
