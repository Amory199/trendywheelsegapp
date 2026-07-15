-- Weekly rental availability: which weekdays a vehicle can be rented on.
-- 0=Sun … 6=Sat (JS getDay convention). Empty array = available every day,
-- so every existing vehicle keeps unrestricted availability.
ALTER TABLE "vehicles" ADD COLUMN "available_days" INTEGER[] NOT NULL DEFAULT '{}';
