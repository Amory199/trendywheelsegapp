-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "call_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "escalation_level" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "last_call_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "crm_rules" (
    "id" UUID NOT NULL,
    "first_call_within_minutes" INTEGER NOT NULL DEFAULT 30,
    "follow_up_call_within_hours" INTEGER NOT NULL DEFAULT 24,
    "reassign_after_hours" INTEGER NOT NULL DEFAULT 48,
    "max_reassignments_before_escalation" INTEGER NOT NULL DEFAULT 2,
    "notify_on_assignment" BOOLEAN NOT NULL DEFAULT true,
    "notify_on_escalation" BOOLEAN NOT NULL DEFAULT true,
    "enforce_rules" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by_id" UUID,

    CONSTRAINT "crm_rules_pkey" PRIMARY KEY ("id")
);
