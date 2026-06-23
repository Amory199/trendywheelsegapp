-- Guided checkout: how each deal is fulfilled (delivery_now / delivery_scheduled
-- / showroom_visit for buy-side; pickup_from_me / dropoff_showroom for sell-side).
ALTER TABLE "reservations"   ADD COLUMN "fulfillment_type" TEXT;
ALTER TABLE "orders"         ADD COLUMN "fulfillment_type" TEXT;
ALTER TABLE "bookings"       ADD COLUMN "fulfillment_type" TEXT;
ALTER TABLE "sales_listings" ADD COLUMN "fulfillment_type" TEXT;
ALTER TABLE "sales_listings" ADD COLUMN "dropoff_location_url" TEXT;
ALTER TABLE "trade_in_quotes" ADD COLUMN "fulfillment_type" TEXT;
ALTER TABLE "trade_in_quotes" ADD COLUMN "dropoff_location_url" TEXT;
