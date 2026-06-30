-- A sale-only cart has no rent price. The column was NOT NULL, so sale-only
-- listings were saved with a placeholder daily_rate = 1 (the validator also
-- required it to be positive), which leaked "EGP 1" into the fleet list and any
-- rent-context display. Make it nullable so sale-only carts carry no rate.
ALTER TABLE "vehicles" ALTER COLUMN "daily_rate" DROP NOT NULL;

-- Backfill: clear the placeholder rent rate on existing sale-only listings.
-- Rent/both listings keep their real rate.
UPDATE "vehicles" SET "daily_rate" = NULL WHERE "listing_type" = 'sale';
