-- CreateEnum
CREATE TYPE "RentalListingStatus" AS ENUM ('submitted', 'reviewing', 'approved', 'declined', 'paused', 'withdrawn');

-- CreateTable
CREATE TABLE "rental_listings" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "category" "VehicleCategory" NOT NULL DEFAULT 'golf-cart',
    "condition" TEXT NOT NULL,
    "daily_rate_egp" DECIMAL(10,2),
    "notes" TEXT,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "RentalListingStatus" NOT NULL DEFAULT 'submitted',
    "decline_reason" TEXT,
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMP(3),
    "vehicle_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rental_listings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rental_listings_user_id_status_idx" ON "rental_listings"("user_id", "status");

-- CreateIndex
CREATE INDEX "rental_listings_status_idx" ON "rental_listings"("status");

-- AddForeignKey
ALTER TABLE "rental_listings" ADD CONSTRAINT "rental_listings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_listings" ADD CONSTRAINT "rental_listings_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_listings" ADD CONSTRAINT "rental_listings_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
