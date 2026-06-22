-- Track C: national-ID verification (front + back) captured once on the user
-- profile and required before any transaction.
ALTER TABLE "users" ADD COLUMN "id_front_url" TEXT;
ALTER TABLE "users" ADD COLUMN "id_back_url" TEXT;
ALTER TABLE "users" ADD COLUMN "id_verified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "id_verified_at" TIMESTAMP(3);
