-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('cart_new', 'cart_used', 'parts', 'accessory');

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "category" "ProductCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price_egp" DECIMAL(12,2) NOT NULL,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "in_stock" BOOLEAN NOT NULL DEFAULT true,
    "stock_count" INTEGER,
    "attributes" JSONB NOT NULL DEFAULT '{}',
    "vehicle_id" UUID,
    "brand" TEXT,
    "model" TEXT,
    "year" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trade_in_quotes" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "condition" TEXT NOT NULL,
    "notes" TEXT,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "quote_egp" DECIMAL(12,2),
    "quote_valid_until" TIMESTAMP(3),
    "applied_to_order_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trade_in_quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transport_requests" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "from_address" TEXT NOT NULL,
    "to_address" TEXT NOT NULL,
    "pickup_at" TIMESTAMP(3) NOT NULL,
    "cargo_notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "price_egp" DECIMAL(12,2),
    "driver_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transport_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "total_egp" DECIMAL(12,2) NOT NULL,
    "trade_in_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price_egp" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "products_category_in_stock_idx" ON "products"("category", "in_stock");

-- CreateIndex
CREATE INDEX "products_price_egp_idx" ON "products"("price_egp");

-- CreateIndex
CREATE INDEX "trade_in_quotes_user_id_status_idx" ON "trade_in_quotes"("user_id", "status");

-- CreateIndex
CREATE INDEX "trade_in_quotes_status_idx" ON "trade_in_quotes"("status");

-- CreateIndex
CREATE INDEX "transport_requests_user_id_status_idx" ON "transport_requests"("user_id", "status");

-- CreateIndex
CREATE INDEX "transport_requests_status_pickup_at_idx" ON "transport_requests"("status", "pickup_at");

-- CreateIndex
CREATE INDEX "orders_user_id_created_at_idx" ON "orders"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_in_quotes" ADD CONSTRAINT "trade_in_quotes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_in_quotes" ADD CONSTRAINT "trade_in_quotes_applied_to_order_id_fkey" FOREIGN KEY ("applied_to_order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_requests" ADD CONSTRAINT "transport_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
