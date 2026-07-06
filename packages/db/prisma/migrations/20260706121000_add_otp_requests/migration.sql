-- Manual-OTP request ledger. Durable per-phone allowance for admin-issued codes
-- delivered via in-app polling + local notification (a brand-new phone has no
-- account/push token, so a server push can't reach it). NOT purged by the
-- otp_codes cleanup cron.
CREATE TABLE "otp_requests" (
  "id" UUID NOT NULL,
  "phone" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "code" TEXT,
  "code_expires_at" TIMESTAMP(3),
  "issued_by_admin_id" UUID,
  "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "issued_at" TIMESTAMP(3),
  CONSTRAINT "otp_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "otp_requests_phone_idx" ON "otp_requests" ("phone");
CREATE INDEX "otp_requests_status_idx" ON "otp_requests" ("status");
