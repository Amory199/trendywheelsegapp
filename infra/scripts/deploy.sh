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

# Health check
sleep 3
STATUS=$(curl -sf http://localhost:4000/healthz | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status','?'))" 2>/dev/null || echo "unreachable")
echo "→ API health: $STATUS"
