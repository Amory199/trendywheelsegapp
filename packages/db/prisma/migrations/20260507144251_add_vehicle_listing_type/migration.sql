-- CreateEnum
CREATE TYPE "ListingType" AS ENUM ('rent', 'sale', 'both');

-- AlterTable
ALTER TABLE "vehicles" ADD COLUMN     "listing_type" "ListingType" NOT NULL DEFAULT 'rent',
ADD COLUMN     "sale_description" TEXT,
ADD COLUMN     "sale_price" DECIMAL(12,2);
