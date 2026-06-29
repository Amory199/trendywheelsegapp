#!/usr/bin/env bash
# Runs automatically after EVERY `next build` of the admin (npm "postbuild" hook).
#
# Why: the ChunkLoadError outage (INC-050 / INC-054 / INC-057) happens when
# `.next` is rebuilt but the running `next start` is NOT restarted — the live
# process keeps serving its in-memory build manifest (old chunk hashes) while
# disk now holds new chunks, so browsers request hashes that 404/400 → blank
# "client-side exception". A documented "always restart" rule kept getting
# bypassed by a bare `pnpm build`, so we encode it: any build of the admin
# restarts the live server, making a stale-manifest state impossible to leave.
#
# No-op when pm2 isn't installed or the prod process isn't running (CI / a dev
# machine), and when invoked from the atomic deploy script (which does its own
# verified restart — TW_DEPLOY=1 skips this to avoid a redundant double cycle).
set -uo pipefail

if [ -n "${TW_DEPLOY:-}" ]; then
  exit 0
fi

if command -v pm2 >/dev/null 2>&1 && pm2 describe trendywheels-admin >/dev/null 2>&1; then
  echo "↻ postbuild: restarting trendywheels-admin so the running server serves the new build (avoids stale-chunk 400s)"
  pm2 restart trendywheels-admin --update-env >/dev/null 2>&1 || true
fi
exit 0
