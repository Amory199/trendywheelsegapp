-- Admin-controlled vehicle-category visibility for the customer app.
-- Stored as the HIDDEN set on the singleton system_config row so a newly added
-- category defaults to visible.
ALTER TABLE "system_config"
  ADD COLUMN "hidden_categories" JSONB NOT NULL DEFAULT '[]';

-- Launch request: rent + discovery show ONLY golf carts and scooters. Seed the
-- hidden set on the existing config row(s) to everything else. Admin can change
-- this any time via the settings panel (PATCH /api/admin/categories/visibility).
UPDATE "system_config"
SET "hidden_categories" = '["hover-board","scooter-sidecar","buggy","utv","jet-ski"]'::jsonb;
