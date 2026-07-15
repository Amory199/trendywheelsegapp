-- Longer-term rental rates (optional; null = derive from daily) + one-off admin
-- blackout dates on top of the weekday availability pattern.
ALTER TABLE "vehicles" ADD COLUMN "weekly_rate" DECIMAL(10,2);
ALTER TABLE "vehicles" ADD COLUMN "monthly_rate" DECIMAL(10,2);
ALTER TABLE "vehicles" ADD COLUMN "blocked_dates" DATE[] NOT NULL DEFAULT '{}';
