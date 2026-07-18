-- QR check-in / handover: record when staff hand the vehicle to the customer at
-- pickup, and which staff member did it. Null = not yet picked up.
ALTER TABLE "bookings" ADD COLUMN "checked_in_at" TIMESTAMP(3);
ALTER TABLE "bookings" ADD COLUMN "checked_in_by_id" UUID;
