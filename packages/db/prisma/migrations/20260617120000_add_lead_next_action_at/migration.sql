-- AlterTable
ALTER TABLE "leads" ADD COLUMN "next_action_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "leads_next_action_at_idx" ON "leads"("next_action_at");
