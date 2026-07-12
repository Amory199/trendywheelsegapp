-- Performance: add missing indexes on hot fan-out / sort paths.
-- All additive (CREATE INDEX only) — no data change, safe on a live DB.

-- User: staff/customer fan-out filters on accountType(+staffRole)+status.
CREATE INDEX "users_account_type_status_idx" ON "users"("account_type", "status");
CREATE INDEX "users_account_type_staff_role_status_idx" ON "users"("account_type", "staff_role", "status");

-- Conversation: inbox lists order by last_message_at desc.
CREATE INDEX "conversations_last_message_at_idx" ON "conversations"("last_message_at");

-- Notification: per-user list filters userId + sorts createdAt; admin feed sorts createdAt.
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- Lead: /team + /my-earnings group/sort by owner + updatedAt.
CREATE INDEX "leads_owner_id_updated_at_idx" ON "leads"("owner_id", "updated_at");
