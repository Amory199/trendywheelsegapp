-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('admin', 'sales', 'support', 'inventory', 'mechanic');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('new', 'contacted', 'qualified', 'proposal', 'won', 'lost');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('signup', 'rent-inquiry', 'sell-inquiry', 'repair-inquiry', 'manual', 'imported');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "sales_assignment_weight" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "sales_target_monthly" DECIMAL(12,2),
ADD COLUMN     "staff_role" "StaffRole";

-- CreateTable
CREATE TABLE "leads" (
    "id" UUID NOT NULL,
    "customer_id" UUID,
    "contact_name" TEXT NOT NULL,
    "contact_phone" TEXT,
    "contact_email" TEXT,
    "source" "LeadSource" NOT NULL DEFAULT 'signup',
    "status" "LeadStatus" NOT NULL DEFAULT 'new',
    "estimated_value" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "owner_id" UUID,
    "assigned_at" TIMESTAMP(3),
    "claim_deadline" TIMESTAMP(3),
    "last_activity_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reassignment_count" INTEGER NOT NULL DEFAULT 0,
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_activities" (
    "id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "actor_id" UUID,
    "type" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "leads_customer_id_key" ON "leads"("customer_id");

-- CreateIndex
CREATE INDEX "leads_owner_id_idx" ON "leads"("owner_id");

-- CreateIndex
CREATE INDEX "leads_status_idx" ON "leads"("status");

-- CreateIndex
CREATE INDEX "leads_claim_deadline_idx" ON "leads"("claim_deadline");

-- CreateIndex
CREATE INDEX "leads_last_activity_at_idx" ON "leads"("last_activity_at");

-- CreateIndex
CREATE INDEX "lead_activities_lead_id_created_at_idx" ON "lead_activities"("lead_id", "created_at");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
