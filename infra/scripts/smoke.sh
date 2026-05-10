#!/usr/bin/env bash
# TrendyWheels API smoke test.
# Covers every customer-facing flow with real authenticated requests, so
# regressions like signed-URL-pointing-at-localhost, missing env vars,
# validation drift, and broken auth are caught before the client clicks.
#
# Usage:  ./smoke.sh [API_BASE]
#         API_BASE defaults to https://api.trendywheelseg.com
#
# Exit code: 0 = all green, non-zero = first failure (with the failing
# request + response printed). Designed to gate `deploy.sh`.

set -uo pipefail

API="${1:-https://api.trendywheelseg.com}"
PASS=0
FAIL=0
FIRST_FAIL=""

green() { printf "\033[0;32m%s\033[0m\n" "$*"; }
red()   { printf "\033[0;31m%s\033[0m\n" "$*"; }
gray()  { printf "\033[0;90m%s\033[0m\n" "$*"; }

assert_status() {
  local label="$1" expected="$2" actual="$3" body="$4"
  if [[ "$actual" == "$expected" ]]; then
    green "  ✓ $label ($actual)"
    PASS=$((PASS+1))
  else
    red   "  ✗ $label expected $expected got $actual"
    gray  "    $(echo "$body" | head -c 240)"
    FAIL=$((FAIL+1))
    [[ -z "$FIRST_FAIL" ]] && FIRST_FAIL="$label"
  fi
}

assert_jq() {
  local label="$1" body="$2" expr="$3"
  if echo "$body" | jq -e "$expr" >/dev/null 2>&1; then
    green "  ✓ $label"
    PASS=$((PASS+1))
  else
    red   "  ✗ $label  ($expr)"
    gray  "    $(echo "$body" | head -c 240)"
    FAIL=$((FAIL+1))
    [[ -z "$FIRST_FAIL" ]] && FIRST_FAIL="$label"
  fi
}

login() {
  local email="$1" pass="$2"
  curl -sS -X POST "$API/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"$pass\"}" \
    | jq -r '.token // empty'
}

req() {
  # req METHOD PATH [TOKEN] [BODY]
  local method="$1" path="$2" token="${3:-}" body="${4:-}"
  local args=(-sS -o /tmp/smoke-body -w "%{http_code}" -X "$method" "$API$path" \
              -H "Content-Type: application/json")
  [[ -n "$token" ]] && args+=(-H "Authorization: Bearer $token")
  [[ -n "$body"  ]] && args+=(-d "$body")
  curl "${args[@]}"
}

# ─── 0 · health ─────────────────────────────────────────────
echo "=== Health ==="
HEALTH=$(curl -sS "$API/healthz")
assert_jq "healthz returns ok" "$HEALTH" '.status == "ok"'

# ─── 1 · auth ───────────────────────────────────────────────
echo "=== Auth ==="
ADMIN_TOKEN=$(login "admin@trendywheelseg.com" "Admin@123!")
if [[ -z "$ADMIN_TOKEN" ]]; then
  red "✗ admin login failed — abort"; exit 1
fi
green "  ✓ admin login (token len ${#ADMIN_TOKEN})"
PASS=$((PASS+1))

CUST_TOKEN=$(login "mohamed@example.com" "Customer@123!")
if [[ -z "$CUST_TOKEN" ]]; then
  red "✗ customer login failed — abort"; exit 1
fi
green "  ✓ customer login"
PASS=$((PASS+1))

SALES_TOKEN=$(login "amira@trendywheelseg.com" "Sales@123!")
[[ -n "$SALES_TOKEN" ]] && green "  ✓ sales login" && PASS=$((PASS+1)) || { red "✗ sales login failed"; FAIL=$((FAIL+1)); }

# ─── 2 · vehicles ───────────────────────────────────────────
echo "=== Vehicles ==="
CODE=$(req GET "/api/vehicles?limit=5"); assert_status "list public" 200 "$CODE" "$(cat /tmp/smoke-body)"
assert_jq "list has data array" "$(cat /tmp/smoke-body)" '.data | type == "array"'

CODE=$(req POST "/api/vehicles" "$ADMIN_TOKEN" '{"name":"Smoke Test Cart","type":"4-seater","seating":4,"fuelType":"electric","transmission":"automatic","dailyRate":500,"location":"Test","status":"available","listingType":"rent","features":[]}')
NEW_VEH_ID=$(jq -r '.data.id // empty' < /tmp/smoke-body)
assert_status "admin create vehicle" 201 "$CODE" "$(cat /tmp/smoke-body)"
[[ -n "$NEW_VEH_ID" ]] && green "  ✓ created vehicle $NEW_VEH_ID" && PASS=$((PASS+1))

if [[ -n "$NEW_VEH_ID" ]]; then
  CODE=$(req DELETE "/api/vehicles/$NEW_VEH_ID" "$ADMIN_TOKEN")
  assert_status "admin delete vehicle" 200 "$CODE" "$(cat /tmp/smoke-body)"
fi

# ─── 3 · products (TRACK AA) ────────────────────────────────
echo "=== Products ==="
for cat in cart_new cart_used parts accessory; do
  CODE=$(req GET "/api/products?category=$cat&limit=3")
  assert_status "list $cat (public)" 200 "$CODE" "$(cat /tmp/smoke-body)"
  assert_jq "  $cat returns at least 1" "$(cat /tmp/smoke-body)" '.total >= 1'
done

PRODUCT_ID=$(curl -sS "$API/api/products?category=parts&limit=1" | jq -r '.data[0].id')
[[ -n "$PRODUCT_ID" ]] && green "  ✓ product detail id=$PRODUCT_ID" && PASS=$((PASS+1))

CODE=$(req GET "/api/products/$PRODUCT_ID")
assert_status "product detail" 200 "$CODE" "$(cat /tmp/smoke-body)"

# ─── 4 · storage (the bug class) ────────────────────────────
echo "=== Storage (presign + PUT + public fetch) ==="
CODE=$(req POST "/api/storage/presign" "$CUST_TOKEN" '{"mimeType":"image/png","prefix":"uploads"}')
assert_status "presign as customer" 200 "$CODE" "$(cat /tmp/smoke-body)"

UP_URL=$(jq -r '.uploadUrl // empty' < /tmp/smoke-body)
FILE_URL=$(jq -r '.fileUrl // empty' < /tmp/smoke-body)

# CRITICAL: signed URL must NOT point at localhost
if [[ "$UP_URL" == *"localhost"* || "$UP_URL" == *"127.0.0.1"* ]]; then
  red "  ✗ uploadUrl contains localhost — clients will fail to upload"
  red "    $UP_URL"
  FAIL=$((FAIL+1))
  FIRST_FAIL="presign points at localhost"
else
  green "  ✓ uploadUrl is public ($UP_URL)"; PASS=$((PASS+1))
fi

# Round-trip a fake PNG
printf '\x89PNG\r\n\x1a\n' > /tmp/smoke-img.png
PUT_CODE=$(curl -sS -o /dev/null -w "%{http_code}" -X PUT --data-binary @/tmp/smoke-img.png \
           -H "Content-Type: image/png" "$UP_URL")
assert_status "PUT to signed URL" 200 "$PUT_CODE" ""

GET_CODE=$(curl -sS -o /dev/null -w "%{http_code}" "$FILE_URL")
assert_status "public fetch via CDN" 200 "$GET_CODE" ""

# ─── 5 · orders + trade-in + transport ──────────────────────
echo "=== Orders / Trade-in / Transport ==="
PART_ID=$(curl -sS "$API/api/products?category=parts&limit=1" | jq -r '.data[0].id')
CODE=$(req POST "/api/orders" "$CUST_TOKEN" "{\"items\":[{\"productId\":\"$PART_ID\",\"quantity\":1}]}")
assert_status "customer creates order" 201 "$CODE" "$(cat /tmp/smoke-body)"
ORDER_ID=$(jq -r '.data.id // empty' < /tmp/smoke-body)

CODE=$(req POST "/api/orders/$ORDER_ID/status" "$ADMIN_TOKEN" '{"status":"paid"}')
assert_status "admin marks paid" 200 "$CODE" "$(cat /tmp/smoke-body)"

CODE=$(req POST "/api/trade-in" "$CUST_TOKEN" '{"brand":"Club Car","model":"Onward","year":2022,"condition":"good","photos":[]}')
assert_status "customer submits trade-in" 201 "$CODE" "$(cat /tmp/smoke-body)"
TI_ID=$(jq -r '.data.id // empty' < /tmp/smoke-body)

CODE=$(req POST "/api/trade-in/$TI_ID/quote" "$ADMIN_TOKEN" '{"quoteEgp":150000,"validForDays":7,"status":"quoted"}')
assert_status "admin quotes trade-in" 200 "$CODE" "$(cat /tmp/smoke-body)"

PICKUP=$(date -u -d '+2 days' +%Y-%m-%dT%H:%M:%S.000Z)
CODE=$(req POST "/api/transport" "$CUST_TOKEN" "{\"fromAddress\":\"Marassi Marina\",\"toAddress\":\"El Gouna\",\"pickupAt\":\"$PICKUP\"}")
assert_status "customer submits transport" 201 "$CODE" "$(cat /tmp/smoke-body)"

# ─── 6 · auth gate sanity ───────────────────────────────────
echo "=== Auth gate ==="
CODE=$(req GET "/api/orders/admin/all")
assert_status "admin endpoint without token → 401" 401 "$CODE" "$(cat /tmp/smoke-body)"
CODE=$(req GET "/api/orders/admin/all" "$CUST_TOKEN")
assert_status "admin endpoint with customer → 403" 403 "$CODE" "$(cat /tmp/smoke-body)"
CODE=$(req GET "/api/orders/admin/all" "$ADMIN_TOKEN")
assert_status "admin endpoint with admin → 200" 200 "$CODE" "$(cat /tmp/smoke-body)"

# ─── summary ────────────────────────────────────────────────
echo
if [[ "$FAIL" == "0" ]]; then
  green "✓ All $PASS checks passed."
  exit 0
else
  red   "✗ $FAIL failed, $PASS passed.  First failure: $FIRST_FAIL"
  exit 1
fi
