-- Add an optional, unique username as a login identifier (alongside phone +
-- email). Username is the chosen handle a user can sign in with; phone stays
-- the canonical account key. Stored lowercased by the app so the unique index
-- is effectively case-insensitive.
ALTER TABLE "users" ADD COLUMN "username" TEXT;
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
