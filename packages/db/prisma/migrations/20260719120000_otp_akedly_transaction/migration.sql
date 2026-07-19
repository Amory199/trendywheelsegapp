-- Store Akedly's transaction handle alongside the code we issued, so a local
-- verification can be reported back to Akedly and their dashboard stops showing
-- every successful signup as "Pending". Null for admin-issued / bypass codes.
ALTER TABLE "otp_codes" ADD COLUMN "akedly_transaction_req_id" TEXT;
