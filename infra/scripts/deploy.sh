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

# Build only what's deployed on the VPS (not admin — that's on Vercel)
echo "→ Building API, support, inventory..."
pnpm turbo run build \
  --filter=@trendywheels/api \
  --filter=@trendywheels/support \
  --filter=@trendywheels/inventory

# Run Prisma migrations
echo "→ Running database migrations..."
pnpm --filter @trendywheels/db exec prisma migrate deploy

# Reload PM2 without downtime
echo "→ Reloading PM2..."
pm2 reload ecosystem.config.js --env production

mkdir -p "$LOG_DIR"
echo "✓ Deploy complete at $(date '+%Y-%m-%d %H:%M:%S')" | tee -a "$LOG_DIR/deploys.log"

# Health check
sleep 3
STATUS=$(curl -sf http://localhost:4000/healthz | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status','?'))" 2>/dev/null || echo "unreachable")
echo "→ API health: $STATUS"
