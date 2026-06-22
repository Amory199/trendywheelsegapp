-- Track D: branded invoices/receipts generated on completed transactions.
CREATE TYPE "InvoiceType" AS ENUM ('rental', 'sale', 'service', 'customization');

CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "type" "InvoiceType" NOT NULL,
    "user_id" UUID NOT NULL,
    "source_type" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "subtotal_egp" DECIMAL(12,2) NOT NULL,
    "tax_egp" DECIMAL(12,2) NOT NULL,
    "total_egp" DECIMAL(12,2) NOT NULL,
    "paid_by" TEXT,
    "pdf_key" TEXT NOT NULL,
    "issued_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "invoices_number_key" ON "invoices"("number");
CREATE INDEX "invoices_user_id_idx" ON "invoices"("user_id");
CREATE INDEX "invoices_type_idx" ON "invoices"("type");

ALTER TABLE "invoices" ADD CONSTRAINT "invoices_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_issued_by_id_fkey"
    FOREIGN KEY ("issued_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
