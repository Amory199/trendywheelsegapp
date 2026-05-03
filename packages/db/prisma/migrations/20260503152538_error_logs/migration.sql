-- CreateTable
CREATE TABLE "error_logs" (
    "id" UUID NOT NULL,
    "level" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "route" TEXT,
    "method" TEXT,
    "status_code" INTEGER,
    "user_id" UUID,
    "request_id" TEXT,
    "user_agent" TEXT,
    "ip_address" TEXT,
    "metadata" JSONB,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "error_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "error_logs_level_created_at_idx" ON "error_logs"("level", "created_at");

-- CreateIndex
CREATE INDEX "error_logs_source_created_at_idx" ON "error_logs"("source", "created_at");

-- CreateIndex
CREATE INDEX "error_logs_user_id_idx" ON "error_logs"("user_id");

-- CreateIndex
CREATE INDEX "error_logs_resolved_at_idx" ON "error_logs"("resolved_at");
