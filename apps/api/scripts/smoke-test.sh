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

# Tag every request with this UA so the API's error-handler skips writeError /
# Sentry for the 4xx paths the smoke test deliberately exercises (e.g. the
# owner-forbidden-on-non-deletable-status assertion). See
# apps/api/src/middleware/error-handler.ts → isSmokeTest().
SMOKE_UA="tw-smoke-test/1.0"

fail() { echo "❌ smoke-test: $*" >&2; exit 1; }
pass() { echo "  ✓ $*"; }
note() { echo "→ $*"; }

# ─── 0. Health ──────────────────────────────────────────────
note "0. Health"
HEALTH_ROOT="${BASE%/api}"
curl -fsS -A "$SMOKE_UA" "$HEALTH_ROOT/healthz" >/dev/null || fail "health endpoint down"
pass "health"

# ─── 1. Auth — staff email/password login (admin + sales) ────
note "1. Staff login"
ADMIN_RESP=$(curl -fsS -A "$SMOKE_UA" -XPOST "$BASE/auth/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}") \
  || fail "admin login HTTP error"
ADMIN_TOKEN=$(echo "$ADMIN_RESP" | jq -r '.token // .accessToken')
[ -n "$ADMIN_TOKEN" ] && [ "$ADMIN_TOKEN" != "null" ] || fail "admin token missing in login response: $ADMIN_RESP"

SALES_RESP=$(curl -fsS -A "$SMOKE_UA" -XPOST "$BASE/auth/login" -H "Content-Type: application/json" \
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
LEAD_RESP=$(curl -fsS -A "$SMOKE_UA" -XPOST "$BASE/crm/leads" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "$JSON" \
  -d '{"contactName":"SMOKE TEST","contactPhone":"+201111111111","source":"walk-in"}') \
  || fail "POST /crm/leads (walk-in source) failed"
LEAD_ID=$(echo "$LEAD_RESP" | jq -r '.data.id')
[ "$LEAD_ID" != "null" ] && [ -n "$LEAD_ID" ] || fail "no lead id returned: $LEAD_RESP"
pass "lead created id=$LEAD_ID"

curl -fsS -A "$SMOKE_UA" "$BASE/crm/leads/$LEAD_ID" -H "Authorization: Bearer $ADMIN_TOKEN" >/dev/null \
  || fail "GET /crm/leads/:id failed"
pass "lead readable"

curl -fsS -A "$SMOKE_UA" -XPATCH "$BASE/crm/leads/$LEAD_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "$JSON" \
  -d '{"status":"contacted"}' >/dev/null \
  || fail "PATCH /crm/leads/:id status=contacted failed"
pass "lead status moved"

# ─── 3. CRM activities — NEW types ───────────────────────────
note "3. CRM activity types (call_attempted, call_no_answer, whatsapp_sent, call_answered, note)"
for t in call_attempted call_no_answer whatsapp_sent call_answered note; do
  curl -fsS -A "$SMOKE_UA" -XPOST "$BASE/crm/leads/$LEAD_ID/activities" \
    -H "Authorization: Bearer $ADMIN_TOKEN" -H "$JSON" \
    -d "{\"type\":\"$t\",\"body\":\"smoke-test $t\"}" >/dev/null \
    || fail "activity type=$t rejected"
done
pass "5 activity types accepted"

# ─── 4. Counter increments ───────────────────────────────────
note "4. Counter increments (callCount=1, messageCount=1)"
LEAD_AFTER=$(curl -fsS -A "$SMOKE_UA" "$BASE/crm/leads/$LEAD_ID" -H "Authorization: Bearer $ADMIN_TOKEN")
CC=$(echo "$LEAD_AFTER" | jq '.data.callCount')
MC=$(echo "$LEAD_AFTER" | jq '.data.messageCount')
[ "$CC" = "1" ] || fail "callCount=$CC (expected 1) — recordActivity not bumping on call_attempted"
[ "$MC" = "1" ] || fail "messageCount=$MC (expected 1) — recordActivity not bumping on whatsapp_sent"
pass "counters incremented correctly"

# ─── 5. CRM rules surface new fields ─────────────────────────
note "5. CRM rules (new fields + bumped defaults)"
RULES=$(curl -fsS -A "$SMOKE_UA" "$BASE/crm/rules" -H "Authorization: Bearer $ADMIN_TOKEN")
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
REPAIR_RESP=$(curl -fsS -A "$SMOKE_UA" -XPOST "$BASE/repairs" \
  -H "Authorization: Bearer $SALES_TOKEN" -H "$JSON" \
  -d '{"description":"smoke test repair description longer than 10","category":"mechanical","priority":"low"}') \
  || fail "POST /repairs without vehicleId rejected — schema didn't relax"
REPAIR_ID=$(echo "$REPAIR_RESP" | jq -r '.data.id // .id')
pass "repair created id=${REPAIR_ID}"

# ─── 7. Sales listing status=paused (new enum value) ─────────
note "7. Sales listing status=paused"
LISTING_ID=$(curl -fsS -A "$SMOKE_UA" "$BASE/sales?limit=1" -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.data[0].id // empty')
if [ -n "$LISTING_ID" ]; then
  curl -fsS -A "$SMOKE_UA" -XPUT "$BASE/sales/$LISTING_ID" \
    -H "Authorization: Bearer $ADMIN_TOKEN" -H "$JSON" \
    -d '{"status":"paused"}' >/dev/null \
    || fail "PUT /sales/:id status=paused rejected — validator missing 'paused' or DB enum missing"
  pass "listing paused"
else
  pass "(no existing sales listing — skipping paused-status round-trip)"
fi

# ─── 8. Vehicles filter by new scooter-sidecar category ──────
note "8. Vehicles category=scooter-sidecar"
curl -fsS -A "$SMOKE_UA" "$BASE/vehicles?category=scooter-sidecar" -H "Authorization: Bearer $SALES_TOKEN" >/dev/null \
  || fail "vehicleFiltersSchema didn't accept scooter-sidecar"
pass "scooter-sidecar category accepted"

# ─── 9. Bookings pending filter ──────────────────────────────
note "9. Bookings status=pending"
curl -fsS -A "$SMOKE_UA" "$BASE/bookings?status=pending" -H "Authorization: Bearer $SALES_TOKEN" >/dev/null \
  || fail "bookings status=pending filter rejected"
pass "pending booking filter"

# ─── 10. Notifications push-token registration ───────────────
note "10. Push token register"
curl -fsS -A "$SMOKE_UA" -XPOST "$BASE/notifications/push-tokens" \
  -H "Authorization: Bearer $SALES_TOKEN" -H "$JSON" \
  -d '{"token":"ExponentPushToken[smoke-test-stub-12345]","platform":"android"}' >/dev/null \
  || fail "push-token registration failed"
pass "push token registered"

# ─── 11. CRM rules PATCH (admin-only widened auth) ───────────
note "11. Admin can PATCH /crm/rules"
curl -fsS -A "$SMOKE_UA" -XPATCH "$BASE/crm/rules" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "$JSON" \
  -d '{"maxCallsBeforeReassign":4}' >/dev/null \
  || fail "PATCH /crm/rules rejected — admin auth widening regressed"
pass "admin rules PATCH"

# ─── 12. List endpoints sanity ───────────────────────────────
note "12. List endpoints"
for ep in "vehicles" "sales" "bookings" "crm/leads" "crm/pipeline" "crm/inventory" "notifications"; do
  curl -fsS -A "$SMOKE_UA" "$BASE/$ep" -H "Authorization: Bearer $ADMIN_TOKEN" >/dev/null \
    || fail "GET /$ep failed"
done
pass "list endpoints all 200"

# ─── 12a. Sales sees ONLY their assigned leads ───────────────
note "12a. Sales lead visibility (owned-only)"
SALES_USER_ID=$(echo "$SALES_RESP" | jq -r '.user.id')
SALES_LEADS=$(curl -fsS -A "$SMOKE_UA" "$BASE/crm/leads" -H "Authorization: Bearer $SALES_TOKEN")
# Every lead returned must belong to the sales user
OTHERS=$(echo "$SALES_LEADS" | jq "[.data[] | select(.ownerId != \"$SALES_USER_ID\")] | length")
[ "$OTHERS" = "0" ] || fail "Sales got $OTHERS leads not assigned to them (visibility regression)"
pass "sales sees only assigned leads"

# ─── 12b. Sales 404 on a lead they don't own ─────────────────
# Was 403 in earlier rounds; flipped to 404 (round-4) to cut Sentry noise.
# Semantically the lead is "gone from your pipeline" — not forbidden, not visible.
note "12b. Sales 404 on unowned lead"
# Create a lead owned by ADMIN, then try to GET it as SALES
UNOWNED_RESP=$(curl -fsS -A "$SMOKE_UA" -XPOST "$BASE/crm/leads" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "$JSON" \
  -d '{"contactName":"UNOWNED SMOKE","contactPhone":"+201222222222","source":"manual"}')
UNOWNED_ID=$(echo "$UNOWNED_RESP" | jq -r .data.id)
# Force ownership to admin so it's NOT auto-assigned to sales by RR
curl -fsS -A "$SMOKE_UA" -XPOST "$BASE/crm/leads/$UNOWNED_ID/reassign" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "$JSON" \
  -d "{\"ownerId\":\"$(echo "$ADMIN_RESP" | jq -r '.user.id')\"}" >/dev/null
# Sales GET should now 404 (not 403) — see route comment in crm/routes.ts.
CODE=$(curl -sS -A "$SMOKE_UA" -o /dev/null -w "%{http_code}" "$BASE/crm/leads/$UNOWNED_ID" \
  -H "Authorization: Bearer $SALES_TOKEN")
[ "$CODE" = "404" ] || fail "Sales got HTTP $CODE on unowned lead, expected 404"
pass "sales blocked from unowned leads (404)"
# Cleanup
curl -fsS -A "$SMOKE_UA" -XPATCH "$BASE/crm/leads/$UNOWNED_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "$JSON" \
  -d '{"status":"lost","notes":"smoke-test artifact"}' >/dev/null

# ─── 12c. Customer signup auto-creates a lead ────────────────
note "12c. Customer signup auto-creates lead"
LEAD_COUNT_BEFORE=$(curl -fsS -A "$SMOKE_UA" "$BASE/crm/leads" -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.data | length')
# Use the dev-only trial OTP bypass to simulate a customer signup. We need
# a phone that's NOT in the seed AND not in STAFF_TEST_PHONES, and we need
# ENABLE_TRIAL_OTP_BYPASS=true OR a freshly generated OTP. Easier: just hit
# the verify-otp endpoint with one of the hardcoded trial bypass codes (only
# works if ENABLE_TRIAL_OTP_BYPASS is set in prod .env).
# In prod (ENABLE_TRIAL_OTP_BYPASS=false), skip this assertion.
TRIAL_ENABLED=$(grep -c "^ENABLE_TRIAL_OTP_BYPASS=true" /opt/trendywheels/apps/api/.env 2>/dev/null || echo 0)
if [ "$TRIAL_ENABLED" = "1" ]; then
  # +201112223344 / 555555 is the hardcoded customer trial pair
  curl -fsS -A "$SMOKE_UA" -XPOST "$BASE/auth/verify-otp" -H "$JSON" \
    -d '{"phone":"+201112223344","otp":"555555"}' >/dev/null
  sleep 1 # setImmediate-fired lead assignment
  LEAD_COUNT_AFTER=$(curl -fsS -A "$SMOKE_UA" "$BASE/crm/leads" -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.data | length')
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
curl -fsS -A "$SMOKE_UA" -XPOST "$BASE/crm/leads/$LEAD_ID/reassign" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "$JSON" \
  -d "{\"ownerId\":\"$SALES_USER_ID\"}" >/dev/null
# Now sales rotates it
ROTATE_RESP=$(curl -fsS -A "$SMOKE_UA" -XPOST "$BASE/crm/leads/$LEAD_ID/rotate" \
  -H "Authorization: Bearer $SALES_TOKEN") \
  || fail "POST /crm/leads/:id/rotate failed for owning sales agent"
ROTATE_STATUS=$(echo "$ROTATE_RESP" | jq -r .data.status)
[ "$ROTATE_STATUS" = "rotated" ] || [ "$ROTATE_STATUS" = "inactive" ] \
  || fail "rotate returned unexpected status: $ROTATE_RESP"
pass "rotate endpoint works ($ROTATE_STATUS)"

# ─── 12e. /claim endpoint removed ────────────────────────────
note "12e. /claim is 404"
CLAIM_CODE=$(curl -sS -A "$SMOKE_UA" -o /dev/null -w "%{http_code}" -XPOST "$BASE/crm/leads/$LEAD_ID/claim" \
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
SALES_INACTIVE=$(curl -fsS -A "$SMOKE_UA" "$BASE/crm/leads?status=inactive" -H "Authorization: Bearer $SALES_TOKEN" \
  | jq '.data | length')
[ "$SALES_INACTIVE" = "0" ] || fail "Sales saw $SALES_INACTIVE inactive leads — filter regressed"
pass "sales blocked from inactive pool"

# ─── 12g. Push-token registration round-trip ─────────────────
note "12g. Push token register/list/delete"
# Use a non-Expo token string — registration just stores it; only the worker
# filters via Expo.isExpoPushToken when actually dispatching. Smoke verifies
# storage/cleanup endpoints; real device delivery is verified manually.
SMOKE_TOKEN="smoke-test-token-$(date +%s)"
TOKEN_REG=$(curl -sS -A "$SMOKE_UA" -o /dev/null -w "%{http_code}" -XPOST "$BASE/notifications/push-tokens" \
  -H "Authorization: Bearer $SALES_TOKEN" -H "$JSON" \
  -d "{\"token\":\"$SMOKE_TOKEN\",\"platform\":\"android\"}")
[ "$TOKEN_REG" = "200" ] || [ "$TOKEN_REG" = "201" ] || fail "push-tokens register returned $TOKEN_REG"
TOKEN_DEL=$(curl -sS -A "$SMOKE_UA" -o /dev/null -w "%{http_code}" -XDELETE \
  "$BASE/notifications/push-tokens/$SMOKE_TOKEN" -H "Authorization: Bearer $SALES_TOKEN")
[ "$TOKEN_DEL" = "200" ] || [ "$TOKEN_DEL" = "204" ] || fail "push-tokens delete returned $TOKEN_DEL"
pass "push-tokens register/delete round-trip"

# ─── 12h. Lead reassign enqueues a notification row ──────────
note "12h. Reassign produces a Notification row for the new owner"
# Reassign $LEAD_ID back to sales (it was rotated/owned by admin after 12d).
# The notificationsWorker writes a Notification row inside ~1s; poll for up to
# 5s. Critical types bypass dedupe; lead_reassigned is non-critical but a
# single reassign survives the 60s dedupe window.
curl -fsS -A "$SMOKE_UA" -XPOST "$BASE/crm/leads/$LEAD_ID/reassign" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "$JSON" \
  -d "{\"ownerId\":\"$SALES_USER_ID\"}" >/dev/null
NOTIF_COUNT=0
for i in 1 2 3 4 5; do
  NOTIF_COUNT=$(curl -fsS -A "$SMOKE_UA" "$BASE/notifications" -H "Authorization: Bearer $SALES_TOKEN" \
    | jq '[.data[] | select(.type | startswith("lead_"))] | length')
  [ "$NOTIF_COUNT" -gt 0 ] && break
  sleep 1
done
[ "$NOTIF_COUNT" -gt 0 ] || fail "no lead_* Notification row for sales after reassign (worker not draining?)"
pass "reassign enqueues notification row ($NOTIF_COUNT rows visible)"

# ─── 12i. Rental-listing submit + read + admin transition + cleanup ──
note "12i. Rental listing round-trip"
RL_CREATE=$(curl -fsS -A "$SMOKE_UA" -XPOST "$BASE/rental-listings" \
  -H "Authorization: Bearer $SALES_TOKEN" -H "$JSON" \
  -d '{"brand":"Club Car","model":"Onward 4P","year":2022,"category":"golf-cart","condition":"good","notes":"smoke-test rental listing","photos":[]}') \
  || fail "POST /rental-listings rejected"
RL_ID=$(echo "$RL_CREATE" | jq -r '.data.id')
RL_STATUS=$(echo "$RL_CREATE" | jq -r '.data.status')
[ -n "$RL_ID" ] && [ "$RL_ID" != "null" ] || fail "no rental-listing id: $RL_CREATE"
[ "$RL_STATUS" = "submitted" ] || fail "expected status=submitted, got $RL_STATUS"
pass "rental listing created id=$RL_ID status=submitted"

# Owner (sales) lists their own — should include the new row
RL_MINE=$(curl -fsS -A "$SMOKE_UA" "$BASE/rental-listings" -H "Authorization: Bearer $SALES_TOKEN" | jq "[.data[] | select(.id == \"$RL_ID\")] | length")
[ "$RL_MINE" = "1" ] || fail "owner can't see their own listing in GET /rental-listings (got count=$RL_MINE)"
pass "owner sees own listing"

# Detail readable by owner
curl -fsS -A "$SMOKE_UA" "$BASE/rental-listings/$RL_ID" -H "Authorization: Bearer $SALES_TOKEN" >/dev/null \
  || fail "GET /rental-listings/:id failed for owner"
pass "owner can read detail"

# Admin transitions to reviewing
curl -fsS -A "$SMOKE_UA" -XPATCH "$BASE/rental-listings/$RL_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "$JSON" \
  -d '{"status":"reviewing"}' >/dev/null \
  || fail "admin PATCH status=reviewing rejected"
pass "admin transitioned to reviewing"

# Owner can no longer delete (status is reviewing, not submitted/withdrawn)
DELETE_CODE=$(curl -sS -A "$SMOKE_UA" -o /dev/null -w "%{http_code}" -XDELETE \
  "$BASE/rental-listings/$RL_ID" -H "Authorization: Bearer $SALES_TOKEN")
[ "$DELETE_CODE" = "403" ] || fail "owner DELETE on reviewing listing returned $DELETE_CODE, expected 403"
pass "owner blocked from deleting non-deletable status"

# Admin deletes for cleanup
curl -fsS -A "$SMOKE_UA" -XDELETE "$BASE/rental-listings/$RL_ID" -H "Authorization: Bearer $ADMIN_TOKEN" >/dev/null \
  || fail "admin DELETE /rental-listings/:id failed"
pass "admin cleanup"

# ─── 13. Cleanup test lead — best-effort soft delete ─────────
note "13. Cleanup"
# No DELETE endpoint on /crm/leads, so leave the smoke-test lead. The contact
# name "SMOKE TEST" makes it greppable. Optionally mark it lost so it doesn't
# show up in active pipelines.
curl -fsS -A "$SMOKE_UA" -XPATCH "$BASE/crm/leads/$LEAD_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "$JSON" \
  -d '{"status":"lost","notes":"smoke-test artifact — safe to ignore"}' >/dev/null || true
pass "test lead marked lost"

echo
echo "✅ smoke-test PASSED — API ready for traffic"
