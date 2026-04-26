-- AlterTable
ALTER TABLE "users" ADD COLUMN     "license_expiry" TIMESTAMP(3),
ADD COLUMN     "license_number" TEXT,
ADD COLUMN     "license_photo_url" TEXT;

-- CreateTable
CREATE TABLE "system_config" (
    "id" UUID NOT NULL,
    "company_name" TEXT NOT NULL DEFAULT 'TrendyWheels',
    "company_email" TEXT,
    "company_phone" TEXT,
    "company_address" TEXT,
    "company_hours" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "tax_rate_pct" DECIMAL(5,2) NOT NULL DEFAULT 14.0,
    "email_templates" JSONB NOT NULL DEFAULT '{}',
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by_id" UUID,

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_notes" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_events" (
    "id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'warning',
    "message" TEXT NOT NULL,
    "vehicle_id" UUID,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_notes_customer_id_created_at_idx" ON "customer_notes"("customer_id", "created_at");

-- CreateIndex
CREATE INDEX "alert_events_type_idx" ON "alert_events"("type");

-- CreateIndex
CREATE INDEX "alert_events_resolved_at_idx" ON "alert_events"("resolved_at");

-- CreateIndex
CREATE INDEX "alert_events_created_at_idx" ON "alert_events"("created_at");

-- AddForeignKey
ALTER TABLE "customer_notes" ADD CONSTRAINT "customer_notes_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_notes" ADD CONSTRAINT "customer_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_events" ADD CONSTRAINT "alert_events_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
