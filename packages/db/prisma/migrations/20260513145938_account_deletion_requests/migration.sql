-- CreateTable
CREATE TABLE "deletion_requests" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "reason" TEXT,
    "user_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "deletion_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "deletion_requests_status_requested_at_idx" ON "deletion_requests"("status", "requested_at");

-- CreateIndex
CREATE INDEX "deletion_requests_email_idx" ON "deletion_requests"("email");
