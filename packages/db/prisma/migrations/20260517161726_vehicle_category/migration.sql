-- CreateEnum
CREATE TYPE "VehicleCategory" AS ENUM ('golf-cart', 'hover-board', 'scooter', 'buggy', 'utv', 'jet-ski');

-- AlterTable
ALTER TABLE "vehicles" ADD COLUMN     "category" "VehicleCategory" NOT NULL DEFAULT 'golf-cart';
