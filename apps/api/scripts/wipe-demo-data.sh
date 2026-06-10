#!/usr/bin/env bash
# Wipe transactional data so the live DB is a clean slate for acceptance
# testing. PRESERVES users (admin + demo staff + demo customers) and the
# catalog (products, vehicles, system config) so the buy/rent flows still
# have something to demo against.
#
# Wipes:
#   - orders / order items / trade-in quotes
#   - leads / lead activities
#   - bookings / vehicle maintenance
#   - repair requests / customization / maintenance / transport requests
#   - sales listings / rental listings
#   - support tickets / customer notes
#   - messages / conversations / participants
#   - notifications / push tokens / broadcasts
#   - audit logs / error logs / alert events
#   - OTPs / refresh tokens / deletion requests
#   - loyalty transactions / promo redemptions / referrals / reviews
#
# Run with: bash apps/api/scripts/wipe-demo-data.sh
set -euo pipefail

PSQL=(env PGPASSWORD=trendywheels psql -h localhost -U trendywheels -d trendywheels -v ON_ERROR_STOP=1)

echo "=== Pre-wipe row counts ==="
"${PSQL[@]}" -c "
SELECT 'users          '||count(*) FROM users UNION ALL
SELECT 'orders         '||count(*) FROM orders UNION ALL
SELECT 'leads          '||count(*) FROM leads UNION ALL
SELECT 'bookings       '||count(*) FROM bookings UNION ALL
SELECT 'repair_requests'||count(*) FROM repair_requests UNION ALL
SELECT 'support_tickets'||count(*) FROM support_tickets UNION ALL
SELECT 'sales_listings '||count(*) FROM sales_listings UNION ALL
SELECT 'products       '||count(*) FROM products UNION ALL
SELECT 'vehicles       '||count(*) FROM vehicles;
"

echo
echo "=== Wiping transactional data (users + catalog preserved) ==="
"${PSQL[@]}" <<'SQL'
BEGIN;

-- Order chain
DELETE FROM order_items;
DELETE FROM orders;
DELETE FROM trade_in_quotes;

-- Lead chain
DELETE FROM lead_activities;
DELETE FROM leads;

-- Bookings + vehicle history (vehicle rows themselves stay)
DELETE FROM bookings;
DELETE FROM vehicle_maintenance;
DELETE FROM vehicle_condition_reports;

-- Service / repairs / listings
DELETE FROM repair_requests;
DELETE FROM maintenance_requests;
DELETE FROM customization_requests;
DELETE FROM transport_requests;
DELETE FROM sales_listings;
DELETE FROM rental_listings;

-- Support
DELETE FROM customer_notes;
DELETE FROM support_tickets;

-- Comms
DELETE FROM messages;
DELETE FROM conversation_participants;
DELETE FROM conversations;
DELETE FROM notifications;
DELETE FROM push_tokens;
DELETE FROM broadcasts;

-- Audit / runtime
DELETE FROM audit_logs;
DELETE FROM error_logs;
DELETE FROM alert_events;
DELETE FROM otp_codes;
DELETE FROM refresh_tokens;
DELETE FROM deletion_requests;

-- Marketing / loyalty
DELETE FROM loyalty_transactions;
DELETE FROM promo_redemptions;
DELETE FROM referrals;
DELETE FROM reviews;

COMMIT;
SQL

echo
echo "=== Post-wipe row counts ==="
"${PSQL[@]}" -c "
SELECT 'users          '||count(*) FROM users UNION ALL
SELECT 'orders         '||count(*) FROM orders UNION ALL
SELECT 'leads          '||count(*) FROM leads UNION ALL
SELECT 'bookings       '||count(*) FROM bookings UNION ALL
SELECT 'repair_requests'||count(*) FROM repair_requests UNION ALL
SELECT 'support_tickets'||count(*) FROM support_tickets UNION ALL
SELECT 'sales_listings '||count(*) FROM sales_listings UNION ALL
SELECT 'products       '||count(*) FROM products UNION ALL
SELECT 'vehicles       '||count(*) FROM vehicles;
"

echo
echo "✓ Wipe complete. Users + catalog (products, vehicles) + system config preserved."
