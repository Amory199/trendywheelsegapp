-- AlterEnum
ALTER TYPE "VehicleCategory" ADD VALUE 'scooter-sidecar';

-- AlterEnum
ALTER TYPE "ListingStatus" ADD VALUE 'paused';

-- AlterTable: CrmRules — new cadence knobs + bumped defaults for fresh installs
ALTER TABLE "crm_rules"
  ALTER COLUMN "first_call_within_minutes" SET DEFAULT 120,
  ALTER COLUMN "follow_up_call_within_hours" SET DEFAULT 4,
  ADD COLUMN "max_calls_before_reassign" INTEGER NOT NULL DEFAULT 4,
  ADD COLUMN "require_message_after_call" BOOLEAN NOT NULL DEFAULT true;

-- Bump existing CrmRules row to the new cadence values
UPDATE "crm_rules"
  SET "first_call_within_minutes" = 120,
      "follow_up_call_within_hours" = 4;

-- AlterTable: Lead — WhatsApp message tracking for cadence enforcement
ALTER TABLE "leads"
  ADD COLUMN "last_message_at" TIMESTAMP(3),
  ADD COLUMN "message_count"   INTEGER NOT NULL DEFAULT 0;
