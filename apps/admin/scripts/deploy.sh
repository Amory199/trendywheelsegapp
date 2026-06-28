#!/usr/bin/env bash
# Atomic admin deploy — the ONLY supported way to ship the admin web.
#
# The ChunkLoadError outage (INC-050 / INC-054) happens when `.next` is rebuilt
# but the running `next start` is NOT restarted: the live server keeps serving
# the OLD page HTML (old chunk hashes) while disk now holds NEW chunks, so the
# browser requests hashes that no longer exist → 400 → blank screen.
#
# This script makes build + restart + verification one inseparable step:
#   1. clean rebuild
#   2. restart pm2 AND prove the process actually cycled (pm_uptime moved)
#   3. verify every chunk the served HTML references exists on disk
# Any failure aborts loudly. Run from anywhere: `bash apps/admin/scripts/deploy.sh`.
set -euo pipefail

cd "$(dirname "$0")/.."
PROC="trendywheels-admin"

uptime_of() { pm2 jlist | jq -r --arg n "$PROC" '.[] | select(.name==$n) | .pm2_env.pm_uptime // 0'; }

echo "▶ [1/3] clean rebuild"
rm -rf .next
pnpm --filter @trendywheels/admin build

echo "▶ [2/3] restart $PROC and confirm it cycled"
BEFORE=$(uptime_of)
pm2 restart "$PROC" --update-env
sleep 4
AFTER=$(uptime_of)
if [ "$AFTER" = "$BEFORE" ] || [ -z "$AFTER" ]; then
  echo "✖ $PROC did not cycle (pm_uptime unchanged: $BEFORE) — the new build is NOT live. ABORT."
  exit 1
fi

echo "▶ [3/3] verify served HTML references only chunks that exist on disk"
HTML=$(curl -fsS -m 15 http://127.0.0.1:3001/ || true)
[ -n "$HTML" ] || { echo "✖ admin did not respond after restart — ABORT"; exit 1; }
MISSING=0
while read -r ch; do
  [ -z "$ch" ] && continue
  disk=".next${ch#/_next}"   # /_next/static/chunks/x.js -> .next/static/chunks/x.js
  if [ ! -f "$disk" ]; then
    echo "✖ served chunk missing on disk: $ch"
    MISSING=1
  fi
done < <(printf '%s' "$HTML" | grep -oE "/_next/static/chunks/[^\"']+\.js" | sort -u)

if [ "$MISSING" != "0" ]; then
  echo "✖ STALE CHUNK detected after restart — deploy is inconsistent. ABORT."
  exit 1
fi

echo "✅ admin deployed: build $(cat .next/BUILD_ID) is live, all served chunks present."
