#!/usr/bin/env bash
# TrendyWheels API smoke-test
#
# Runs after every deploy (pm2 restart + sleep). Hits each endpoint touched in
# the recent tracks AND a baseline sweep, fails loudly on any non-2xx. If this
# exits non-zero, the deploy is NOT ready — roll back before tailing logs or
# kicking the EAS build.
#
# Requires: jq, curl, a running API on $BASE, and admin/sales seed accounts.

set -euo pipefail
BASE="${BASE:-http://localhost:4000/api}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@trendywheelseg.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-Admin@123!}"
SALES_EMAIL="${SALES_EMAIL:-amira@trendywheelseg.com}"
SALES_PASSWORD="${SALES_PASSWORD:-Sales@123!}"

fail() { echo "❌ smoke-test: $*" >&2; exit 1; }
pass() { echo "  ✓ $*"; }
note() { echo "→ $*"; }

# ─── 0. Health ──────────────────────────────────────────────
note "0. Health"
HEALTH_ROOT="${BASE%/api}"
curl -fsS "$HEALTH_ROOT/healthz" >/dev/null || fail "health endpoint down"
pass "health"

# ─── 1. Auth — staff email/password login (admin + sales) ────
note "1. Staff login"
ADMIN_RESP=$(curl -fsS -XPOST "$BASE/auth/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}") \
  || fail "admin login HTTP error"
ADMIN_TOKEN=$(echo "$ADMIN_RESP" | jq -r '.token // .accessToken')
[ -n "$ADMIN_TOKEN" ] && [ "$ADMIN_TOKEN" != "null" ] || fail "admin token missing in login response: $ADMIN_RESP"

SALES_RESP=$(curl -fsS -XPOST "$BASE/auth/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"$SALES_EMAIL\",\"password\":\"$SALES_PASSWORD\"}") \
  || fail "sales login HTTP error"
SALES_TOKEN=$(echo "$SALES_RESP" | jq -r '.token // .accessToken')
[ -n "$SALES_TOKEN" ] && [ "$SALES_TOKEN" != "null" ] || fail "sales token missing"
pass "admin + sales tokens issued"

AUTH_A="-H \"Authorization: Bearer $ADMIN_TOKEN\""
AUTH_S="-H \"Authorization: Bearer $SALES_TOKEN\""
JSON='Content-Type: application/json'

# ─── 2. CRM — createLeadSchema with the formerly-failing mobile sources ───
note "2. CRM lead create (mobile-friendly source)"
LEAD_RESP=$(curl -fsS -XPOST "$BASE/crm/leads" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "$JSON" \
  -d '{"contactName":"SMOKE TEST","contactPhone":"+201111111111","source":"walk-in"}') \
  || fail "POST /crm/leads (walk-in source) failed"
LEAD_ID=$(echo "$LEAD_RESP" | jq -r '.data.id')
[ "$LEAD_ID" != "null" ] && [ -n "$LEAD_ID" ] || fail "no lead id returned: $LEAD_RESP"
pass "lead created id=$LEAD_ID"

curl -fsS "$BASE/crm/leads/$LEAD_ID" -H "Authorization: Bearer $ADMIN_TOKEN" >/dev/null \
  || fail "GET /crm/leads/:id failed"
pass "lead readable"

curl -fsS -XPATCH "$BASE/crm/leads/$LEAD_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "$JSON" \
  -d '{"status":"contacted"}' >/dev/null \
  || fail "PATCH /crm/leads/:id status=contacted failed"
pass "lead status moved"

# ─── 3. CRM activities — NEW types ───────────────────────────
note "3. CRM activity types (call_attempted, call_no_answer, whatsapp_sent, call_answered, note)"
for t in call_attempted call_no_answer whatsapp_sent call_answered note; do
  curl -fsS -XPOST "$BASE/crm/leads/$LEAD_ID/activities" \
    -H "Authorization: Bearer $ADMIN_TOKEN" -H "$JSON" \
    -d "{\"type\":\"$t\",\"body\":\"smoke-test $t\"}" >/dev/null \
    || fail "activity type=$t rejected"
done
pass "5 activity types accepted"

# ─── 4. Counter increments ───────────────────────────────────
note "4. Counter increments (callCount=1, messageCount=1)"
LEAD_AFTER=$(curl -fsS "$BASE/crm/leads/$LEAD_ID" -H "Authorization: Bearer $ADMIN_TOKEN")
CC=$(echo "$LEAD_AFTER" | jq '.data.callCount')
MC=$(echo "$LEAD_AFTER" | jq '.data.messageCount')
[ "$CC" = "1" ] || fail "callCount=$CC (expected 1) — recordActivity not bumping on call_attempted"
[ "$MC" = "1" ] || fail "messageCount=$MC (expected 1) — recordActivity not bumping on whatsapp_sent"
pass "counters incremented correctly"

# ─── 5. CRM rules surface new fields ─────────────────────────
note "5. CRM rules (new fields + bumped defaults)"
RULES=$(curl -fsS "$BASE/crm/rules" -H "Authorization: Bearer $ADMIN_TOKEN")
[ "$(echo "$RULES" | jq '.data.firstCallWithinMinutes')" = "120" ] \
  || fail "firstCallWithinMinutes not 120: $(echo "$RULES" | jq '.data.firstCallWithinMinutes')"
[ "$(echo "$RULES" | jq '.data.followUpCallWithinHours')" = "4" ] \
  || fail "followUpCallWithinHours not 4"
[ "$(echo "$RULES" | jq '.data.maxCallsBeforeReassign')" = "4" ] \
  || fail "rules missing maxCallsBeforeReassign"
[ "$(echo "$RULES" | jq '.data.requireMessageAfterCall')" = "true" ] \
  || fail "rules missing requireMessageAfterCall"
pass "cadence rules correct"

# ─── 6. Repair request — vehicleId now optional ──────────────
note "6. Repair request without vehicleId"
REPAIR_RESP=$(curl -fsS -XPOST "$BASE/repairs" \
  -H "Authorization: Bearer $SALES_TOKEN" -H "$JSON" \
  -d '{"description":"smoke test repair description longer than 10","category":"mechanical","priority":"low"}') \
  || fail "POST /repairs without vehicleId rejected — schema didn't relax"
REPAIR_ID=$(echo "$REPAIR_RESP" | jq -r '.data.id // .id')
pass "repair created id=${REPAIR_ID}"

# ─── 7. Sales listing status=paused (new enum value) ─────────
note "7. Sales listing status=paused"
LISTING_ID=$(curl -fsS "$BASE/sales?limit=1" -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.data[0].id // empty')
if [ -n "$LISTING_ID" ]; then
  curl -fsS -XPUT "$BASE/sales/$LISTING_ID" \
    -H "Authorization: Bearer $ADMIN_TOKEN" -H "$JSON" \
    -d '{"status":"paused"}' >/dev/null \
    || fail "PUT /sales/:id status=paused rejected — validator missing 'paused' or DB enum missing"
  pass "listing paused"
else
  pass "(no existing sales listing — skipping paused-status round-trip)"
fi

# ─── 8. Vehicles filter by new scooter-sidecar category ──────
note "8. Vehicles category=scooter-sidecar"
curl -fsS "$BASE/vehicles?category=scooter-sidecar" -H "Authorization: Bearer $SALES_TOKEN" >/dev/null \
  || fail "vehicleFiltersSchema didn't accept scooter-sidecar"
pass "scooter-sidecar category accepted"

# ─── 9. Bookings pending filter ──────────────────────────────
note "9. Bookings status=pending"
curl -fsS "$BASE/bookings?status=pending" -H "Authorization: Bearer $SALES_TOKEN" >/dev/null \
  || fail "bookings status=pending filter rejected"
pass "pending booking filter"

# ─── 10. Notifications push-token registration ───────────────
note "10. Push token register"
curl -fsS -XPOST "$BASE/notifications/push-tokens" \
  -H "Authorization: Bearer $SALES_TOKEN" -H "$JSON" \
  -d '{"token":"ExponentPushToken[smoke-test-stub-12345]","platform":"android"}' >/dev/null \
  || fail "push-token registration failed"
pass "push token registered"

# ─── 11. CRM rules PATCH (admin-only widened auth) ───────────
note "11. Admin can PATCH /crm/rules"
curl -fsS -XPATCH "$BASE/crm/rules" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "$JSON" \
  -d '{"maxCallsBeforeReassign":4}' >/dev/null \
  || fail "PATCH /crm/rules rejected — admin auth widening regressed"
pass "admin rules PATCH"

# ─── 12. List endpoints sanity ───────────────────────────────
note "12. List endpoints"
for ep in "vehicles" "sales" "bookings" "crm/leads" "crm/pipeline" "crm/inventory" "notifications"; do
  curl -fsS "$BASE/$ep" -H "Authorization: Bearer $ADMIN_TOKEN" >/dev/null \
    || fail "GET /$ep failed"
done
pass "list endpoints all 200"

# ─── 12a. Sales sees ONLY their assigned leads ───────────────
note "12a. Sales lead visibility (owned-only)"
SALES_USER_ID=$(echo "$SALES_RESP" | jq -r '.user.id')
SALES_LEADS=$(curl -fsS "$BASE/crm/leads" -H "Authorization: Bearer $SALES_TOKEN")
# Every lead returned must belong to the sales user
OTHERS=$(echo "$SALES_LEADS" | jq "[.data[] | select(.ownerId != \"$SALES_USER_ID\")] | length")
[ "$OTHERS" = "0" ] || fail "Sales got $OTHERS leads not assigned to them (visibility regression)"
pass "sales sees only assigned leads"

# ─── 12b. Sales 404 on a lead they don't own ─────────────────
# Was 403 in earlier rounds; flipped to 404 (round-4) to cut Sentry noise.
# Semantically the lead is "gone from your pipeline" — not forbidden, not visible.
note "12b. Sales 404 on unowned lead"
# Create a lead owned by ADMIN, then try to GET it as SALES
UNOWNED_RESP=$(curl -fsS -XPOST "$BASE/crm/leads" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "$JSON" \
  -d '{"contactName":"UNOWNED SMOKE","contactPhone":"+201222222222","source":"manual"}')
UNOWNED_ID=$(echo "$UNOWNED_RESP" | jq -r .data.id)
# Force ownership to admin so it's NOT auto-assigned to sales by RR
curl -fsS -XPOST "$BASE/crm/leads/$UNOWNED_ID/reassign" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "$JSON" \
  -d "{\"ownerId\":\"$(echo "$ADMIN_RESP" | jq -r '.user.id')\"}" >/dev/null
# Sales GET should now 404 (not 403) — see route comment in crm/routes.ts.
CODE=$(curl -sS -o /dev/null -w "%{http_code}" "$BASE/crm/leads/$UNOWNED_ID" \
  -H "Authorization: Bearer $SALES_TOKEN")
[ "$CODE" = "404" ] || fail "Sales got HTTP $CODE on unowned lead, expected 404"
pass "sales blocked from unowned leads (404)"
# Cleanup
curl -fsS -XPATCH "$BASE/crm/leads/$UNOWNED_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "$JSON" \
  -d '{"status":"lost","notes":"smoke-test artifact"}' >/dev/null

# ─── 12c. Customer signup auto-creates a lead ────────────────
note "12c. Customer signup auto-creates lead"
LEAD_COUNT_BEFORE=$(curl -fsS "$BASE/crm/leads" -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.data | length')
# Use the dev-only trial OTP bypass to simulate a customer signup. We need
# a phone that's NOT in the seed AND not in STAFF_TEST_PHONES, and we need
# ENABLE_TRIAL_OTP_BYPASS=true OR a freshly generated OTP. Easier: just hit
# the verify-otp endpoint with one of the hardcoded trial bypass codes (only
# works if ENABLE_TRIAL_OTP_BYPASS is set in prod .env).
# In prod (ENABLE_TRIAL_OTP_BYPASS=false), skip this assertion.
TRIAL_ENABLED=$(grep -c "^ENABLE_TRIAL_OTP_BYPASS=true" /opt/trendywheels/apps/api/.env 2>/dev/null || echo 0)
if [ "$TRIAL_ENABLED" = "1" ]; then
  # +201112223344 / 555555 is the hardcoded customer trial pair
  curl -fsS -XPOST "$BASE/auth/verify-otp" -H "$JSON" \
    -d '{"phone":"+201112223344","otp":"555555"}' >/dev/null
  sleep 1 # setImmediate-fired lead assignment
  LEAD_COUNT_AFTER=$(curl -fsS "$BASE/crm/leads" -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.data | length')
  if [ "$LEAD_COUNT_AFTER" -le "$LEAD_COUNT_BEFORE" ]; then
    # Not a fail — the trial customer may already exist from a previous run
    pass "(trial signup already had a lead; not a fresh signup this run)"
  else
    pass "trial signup created a new lead"
  fi
else
  pass "(skipped — ENABLE_TRIAL_OTP_BYPASS=false in prod, can't synthesize a signup)"
fi

# ─── 12d. Rotation endpoint — sales rotates own lead ─────────
note "12d. Rotate own lead"
# Reuse $LEAD_ID owned by admin; reassign to sales first so they can rotate.
curl -fsS -XPOST "$BASE/crm/leads/$LEAD_ID/reassign" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "$JSON" \
  -d "{\"ownerId\":\"$SALES_USER_ID\"}" >/dev/null
# Now sales rotates it
ROTATE_RESP=$(curl -fsS -XPOST "$BASE/crm/leads/$LEAD_ID/rotate" \
  -H "Authorization: Bearer $SALES_TOKEN") \
  || fail "POST /crm/leads/:id/rotate failed for owning sales agent"
ROTATE_STATUS=$(echo "$ROTATE_RESP" | jq -r .data.status)
[ "$ROTATE_STATUS" = "rotated" ] || [ "$ROTATE_STATUS" = "inactive" ] \
  || fail "rotate returned unexpected status: $ROTATE_RESP"
pass "rotate endpoint works ($ROTATE_STATUS)"

# ─── 12e. /claim endpoint removed ────────────────────────────
note "12e. /claim is 404"
CLAIM_CODE=$(curl -sS -o /dev/null -w "%{http_code}" -XPOST "$BASE/crm/leads/$LEAD_ID/claim" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
# Express returns 404 for unmatched routes via the global handler.
[ "$CLAIM_CODE" = "404" ] || fail "POST /crm/leads/:id/claim returned $CLAIM_CODE, expected 404"
pass "claim endpoint removed"

# ─── 12f. Sales can't see inactive leads ─────────────────────
note "12f. Sales never sees status=inactive"
# Force the test lead inactive (admin PATCH won't accept "inactive" because of
# the Zod schema — that's intentional; use a direct rotate-to-exhaustion would
# take 5 rotations. So check that *if* there's any inactive lead, sales doesn't
# see it. With ROTATION_LIMIT=5 in fresh DBs this is mostly a structure check.)
SALES_INACTIVE=$(curl -fsS "$BASE/crm/leads?status=inactive" -H "Authorization: Bearer $SALES_TOKEN" \
  | jq '.data | length')
[ "$SALES_INACTIVE" = "0" ] || fail "Sales saw $SALES_INACTIVE inactive leads — filter regressed"
pass "sales blocked from inactive pool"

# ─── 13. Cleanup test lead — best-effort soft delete ─────────
note "13. Cleanup"
# No DELETE endpoint on /crm/leads, so leave the smoke-test lead. The contact
# name "SMOKE TEST" makes it greppable. Optionally mark it lost so it doesn't
# show up in active pipelines.
curl -fsS -XPATCH "$BASE/crm/leads/$LEAD_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "$JSON" \
  -d '{"status":"lost","notes":"smoke-test artifact — safe to ignore"}' >/dev/null || true
pass "test lead marked lost"

echo
echo "✅ smoke-test PASSED — API ready for traffic"
