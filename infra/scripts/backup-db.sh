#!/usr/bin/env bash
# Nightly Postgres backup -> gzip -> MinIO.
# Streams pg_dump straight into mc pipe (no on-disk temp file).
# Prunes objects under postgres/ older than KEEP_DAYS.
set -euo pipefail

# ── Config ───────────────────────────────────────────────────────────────────
CONTAINER="infra-postgres-1"
DB="trendywheels"
USER="trendywheels"
MC_ALIAS="local"
BUCKET="backups"
LOG="/var/log/trendywheels/backup.log"
KEEP_DAYS=7

# Load infra/.env so POSTGRES_PASSWORD / MINIO creds are available under cron.
if [ -f /opt/trendywheels/infra/.env ]; then
  set -a
  # shellcheck disable=SC1091
  . /opt/trendywheels/infra/.env
  set +a
fi

# ── Logging helpers ──────────────────────────────────────────────────────────
mkdir -p "$(dirname "$LOG")"
log() {
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S %Z')" "$*" | tee -a "$LOG"
}
fail() {
  log "ERROR: $*"
  exit 1
}
trap 'rc=$?; if [ $rc -ne 0 ]; then log "FAILED (exit=$rc) at line $LINENO"; fi' EXIT

DATE_DIR="$(date +%F)"
REMOTE_KEY="${MC_ALIAS}/${BUCKET}/postgres/${DATE_DIR}/db.sql.gz"

log "=== Backup start: container=${CONTAINER} db=${DB} -> ${REMOTE_KEY} ==="

# ── Preflight ────────────────────────────────────────────────────────────────
command -v docker >/dev/null 2>&1 || fail "docker not found in PATH"
command -v mc >/dev/null 2>&1     || fail "mc (MinIO client) not found in PATH"

docker ps --format '{{.Names}}' | grep -qx "$CONTAINER" \
  || fail "container '${CONTAINER}' is not running"

mc alias list "$MC_ALIAS" >/dev/null 2>&1 \
  || fail "mc alias '${MC_ALIAS}' is not configured"

mc mb --ignore-existing "${MC_ALIAS}/${BUCKET}" >/dev/null \
  || fail "could not ensure bucket '${BUCKET}' exists"

# ── Dump → gzip → MinIO (single stream, fail on any pipe stage) ──────────────
# pg_dump runs *inside* the container so the unix socket / env auth is used.
# `set -o pipefail` (from set -euo pipefail) propagates any failure.
log "Streaming pg_dump | gzip -> mc pipe ${REMOTE_KEY}"
docker exec -i \
  -e PGPASSWORD="${POSTGRES_PASSWORD:-trendywheels}" \
  "$CONTAINER" \
  pg_dump -U "$USER" -d "$DB" --no-owner --no-privileges \
  | gzip -c \
  | mc pipe "$REMOTE_KEY" \
  || fail "backup pipeline failed (pg_dump | gzip | mc pipe)"

# Capture object size for the log line.
SIZE="$(mc stat --json "$REMOTE_KEY" 2>/dev/null \
  | sed -n 's/.*"size":\([0-9]*\).*/\1/p' | head -1)"
SIZE="${SIZE:-unknown}"
log "Uploaded: ${REMOTE_KEY} (${SIZE} bytes)"

# ── Retention: drop date-prefixed dirs older than KEEP_DAYS ──────────────────
# We use date arithmetic on the YYYY-MM-DD prefix rather than mc --older-than
# so it works against the dated folder layout (postgres/YYYY-MM-DD/db.sql.gz).
CUTOFF="$(date -d "${KEEP_DAYS} days ago" +%F)"
log "Pruning backups with date < ${CUTOFF} (KEEP_DAYS=${KEEP_DAYS})"

PRUNED=0
while IFS= read -r ENTRY; do
  # mc ls output: "[date time]  SIZE  name/"
  NAME="$(printf '%s\n' "$ENTRY" | awk '{print $NF}')"
  NAME="${NAME%/}"
  # Only consider YYYY-MM-DD-shaped names
  if [[ "$NAME" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
    if [[ "$NAME" < "$CUTOFF" ]]; then
      log "  removing old backup dir: postgres/${NAME}/"
      mc rm --recursive --force "${MC_ALIAS}/${BUCKET}/postgres/${NAME}/" >/dev/null \
        || fail "failed to remove postgres/${NAME}/"
      PRUNED=$((PRUNED + 1))
    fi
  fi
done < <(mc ls "${MC_ALIAS}/${BUCKET}/postgres/" 2>/dev/null || true)

log "Prune complete (${PRUNED} dir(s) removed)"
log "=== Backup OK: ${REMOTE_KEY} ==="
