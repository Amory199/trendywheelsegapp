-- CreateTable
CREATE TABLE "alert_config" (
    "id" UUID NOT NULL,
    "utilization_max_pct" INTEGER NOT NULL DEFAULT 80,
    "maintenance_due_days" INTEGER NOT NULL DEFAULT 7,
    "max_concurrent_repairs" INTEGER NOT NULL DEFAULT 5,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by_id" UUID,

    CONSTRAINT "alert_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_condition_reports" (
    "id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "reporter_id" UUID NOT NULL,
    "notes" TEXT NOT NULL,
    "photos" JSONB NOT NULL DEFAULT '[]',
    "severity" TEXT NOT NULL DEFAULT 'minor',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_condition_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vehicle_condition_reports_vehicle_id_created_at_idx" ON "vehicle_condition_reports"("vehicle_id", "created_at");

-- AddForeignKey
ALTER TABLE "vehicle_condition_reports" ADD CONSTRAINT "vehicle_condition_reports_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_condition_reports" ADD CONSTRAINT "vehicle_condition_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
