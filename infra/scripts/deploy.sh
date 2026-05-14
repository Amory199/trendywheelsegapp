#!/usr/bin/env bash
# Deploy script — runs on VPS as deploy user.
# Called by GitHub Actions or manually after setup.
set -euo pipefail

APP_DIR="/opt/trendywheels"
LOG_DIR="/var/log/trendywheels"

echo "=== TrendyWheels Deploy $(date '+%Y-%m-%d %H:%M:%S') ==="

cd "$APP_DIR"

# Pull latest
echo "→ Pulling latest code..."
git pull origin main

# Install dependencies (frozen lockfile = no surprises in production)
echo "→ Installing dependencies..."
pnpm install --frozen-lockfile

# Build everything that runs on the VPS
echo "→ Building API, admin, support, inventory, customer..."
pnpm turbo run build \
  --filter=@trendywheels/api \
  --filter=@trendywheels/admin \
  --filter=@trendywheels/support \
  --filter=@trendywheels/inventory \
  --filter=@trendywheels/customer

# Run Prisma migrations
echo "→ Running database migrations..."
# prisma migrate deploy reads DATABASE_URL from env, but a non-interactive
# SSH session has none. Source it from apps/api/.env (the source of truth).
if [ -f "$APP_DIR/apps/api/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$APP_DIR/apps/api/.env"
  set +a
fi
pnpm --filter @trendywheels/db exec prisma migrate deploy

# Reload PM2 without downtime
echo "→ Reloading PM2..."
pm2 reload "$APP_DIR/infra/ecosystem.config.js" --env production

mkdir -p "$LOG_DIR"
echo "✓ Deploy complete at $(date '+%Y-%m-%d %H:%M:%S')" | tee -a "$LOG_DIR/deploys.log"

# Health check — PM2 reload is graceful but has a brief window where the
# old worker has shut down and the new one is still booting. Poll up to
# 30 seconds before declaring the API down (instead of trusting one shot
# at the 3-second mark and failing the whole deploy on a 502).
STATUS="unreachable"
for i in 1 2 3 4 5 6 7 8 9 10; do
  sleep 3
  STATUS=$(curl -sf http://localhost:4000/healthz | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status','?'))" 2>/dev/null || echo "unreachable")
  [[ "$STATUS" == "ok" ]] && break
done
echo "→ API health: $STATUS (after ${i} attempt(s))"

# Smoke test the whole API surface so a regression (broken validator,
# wrong env, signed URL pointing at localhost, etc) fails loudly here
# instead of in front of the client.
echo "→ Running smoke tests..."
if "$APP_DIR/infra/scripts/smoke.sh" "https://api.trendywheelseg.com"; then
  echo "✓ Smoke green"
else
  echo "✗ Smoke FAILED — review logs above."
  exit 1
fi
