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

# Build everything that runs on the VPS.
# TW_DEPLOY=1 tells apps/admin's postbuild hook to SKIP its own pm2 restart —
# this script does an authoritative hard restart + chunk verification for admin
# below, so we don't want the build step also cycling the process (the old
# double-restart race). The postbuild hook still protects ad-hoc manual builds
# that don't go through this script. (INC-057)
export TW_DEPLOY=1
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
# Sourcing a .env in the shell is fragile: any UNQUOTED value containing a shell
# metacharacter silently mis-parses. A `&` in DATABASE_URL's query string
# (?connection_limit=10&pool_timeout=20) backgrounded the assignment, so the var
# never landed and every migrate run died on "Environment variable not found" —
# see the 2026-07-18 deploy. Values are quoted in .env now; this guard makes a
# regression fail loudly here instead of deep inside Prisma.
if [ -z "${DATABASE_URL:-}" ]; then
  echo "✗ DATABASE_URL is empty after sourcing apps/api/.env." >&2
  echo "  Check that its value is QUOTED — an unquoted & or space breaks sourcing." >&2
  exit 1
fi
pnpm --filter @trendywheels/db exec prisma migrate deploy

# Restart / reload PM2.
#
# Split strategy by app:
#   - Next.js apps (admin, support, inventory, customer) are stateless HTTP
#     servers — `pm2 reload` swaps workers gracefully so in-flight requests
#     finish on the old worker while new traffic hits the new one. Zero
#     downtime.
#   - trendywheels-api holds long-lived TCP/WebSocket connections and
#     trendywheels-workers owns BullMQ job leases; a graceful reload would
#     leave both halves talking to Redis for the handoff window, risking
#     double-processed jobs and split-brain socket state. A hard `pm2
#     restart` is the safer call here — the API health-poll loop below
#     absorbs the brief 502 window.
echo "→ Reloading Next.js apps (zero-downtime)..."
pm2 reload "$APP_DIR/infra/ecosystem.config.js" --only trendywheels-support,trendywheels-inventory,trendywheels-customer --env production

# Admin gets a HARD restart, NOT a graceful reload. A graceful reload keeps the
# OLD worker draining in-flight requests — and that old worker serves the old
# build's HTML (old chunk hashes) while disk now holds the new content-hashed
# chunks → ChunkLoadError / blank screen for anyone loading during the handoff.
# A hard restart cycles straight onto the new build with only a sub-second blip
# (acceptable for the internal console). This is the recurring INC-050/054/057.
echo "→ Restarting admin (hard, to avoid stale-chunk handoff window)..."
pm2 restart "$APP_DIR/infra/ecosystem.config.js" --only trendywheels-admin --env production

echo "→ Restarting API + workers (stateful: sockets + BullMQ)..."
pm2 restart "$APP_DIR/infra/ecosystem.config.js" --only trendywheels-api,trendywheels-workers --env production

# Verify admin is serving only chunks that exist on disk — fail the deploy LOUDLY
# if a stale manifest slipped through, instead of letting users hit a blank
# ChunkLoadError screen. (INC-057)
echo "→ Verifying admin chunk consistency..."
sleep 4
ADMIN_HTML=$(curl -fsS -m 15 http://127.0.0.1:3001/ 2>/dev/null || true)
if [ -n "$ADMIN_HTML" ]; then
  CHUNK_MISSING=0
  while read -r ch; do
    [ -z "$ch" ] && continue
    disk="$APP_DIR/apps/admin/.next${ch#/_next}"
    if [ ! -f "$disk" ]; then
      echo "✗ admin serving a chunk missing on disk: $ch"
      CHUNK_MISSING=1
    fi
  done < <(printf '%s' "$ADMIN_HTML" | grep -oE "/_next/static/chunks/[^\"']+\.js" | sort -u)
  if [ "$CHUNK_MISSING" != "0" ]; then
    echo "✗ STALE admin chunks detected after restart — aborting deploy."
    exit 1
  fi
  echo "✓ admin chunks consistent"
else
  echo "⚠ admin did not respond on :3001 for chunk verification (continuing)"
fi

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
