#!/usr/bin/env bash
# Backup-restore drill: pull the most recent dump from MinIO, restore it
# into a throwaway database, and assert row counts match prod.
#
# Usage:  ./infra/scripts/restore.sh
#
# Exits 0 if the restore is healthy; non-zero otherwise.
set -euo pipefail

if [ -f /opt/trendywheels/infra/.env ]; then
  set -a
  # shellcheck disable=SC1091
  . /opt/trendywheels/infra/.env
  set +a
fi

PROD_DB="trendywheels"
TEST_DB="trendywheels_restore_test_$(date +%s)"
PG_USER="${POSTGRES_USER:-trendywheels}"
PG_PW="${POSTGRES_PASSWORD:-trendywheels}"
MINIO_ALIAS="restore-drill"
MINIO_BUCKET="backups"
TMP_DIR=$(mktemp -d)
LATEST_LOCAL="${TMP_DIR}/latest.sql.gz"

cleanup() {
  echo "→ Cleaning up test database + temp files"
  PGPASSWORD="$PG_PW" dropdb -U "$PG_USER" -h 127.0.0.1 --if-exists "$TEST_DB" 2>/dev/null || true
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

echo "=== Restore drill: $(date -u '+%Y-%m-%dT%H:%M:%SZ') ==="

# 1. Pull the most recent dump from MinIO
mc alias set "$MINIO_ALIAS" http://127.0.0.1:9000 \
  "${MINIO_ROOT_USER:-minioadmin}" \
  "${MINIO_ROOT_PASSWORD:-minioadmin}" --quiet
LATEST_KEY=$(mc ls "${MINIO_ALIAS}/${MINIO_BUCKET}/postgres/" | awk '{print $NF}' | sort | tail -n 1)
if [ -z "$LATEST_KEY" ]; then
  echo "✖ no backups found in ${MINIO_BUCKET}/postgres/"
  exit 2
fi
echo "→ Latest dump: $LATEST_KEY"
mc cp "${MINIO_ALIAS}/${MINIO_BUCKET}/postgres/${LATEST_KEY}" "$LATEST_LOCAL" --quiet
SIZE=$(du -sh "$LATEST_LOCAL" | cut -f1)
echo "→ Pulled ${SIZE}"

# 2. Create a throwaway database and restore the dump into it
echo "→ Creating throwaway database $TEST_DB"
PGPASSWORD="$PG_PW" createdb -U "$PG_USER" -h 127.0.0.1 "$TEST_DB"

echo "→ Restoring dump"
gunzip -c "$LATEST_LOCAL" | PGPASSWORD="$PG_PW" psql -U "$PG_USER" -h 127.0.0.1 -d "$TEST_DB" -q -v ON_ERROR_STOP=1 >/dev/null

# 3. Compare row counts on key tables vs prod
TABLES=(users vehicles bookings repair_requests sales_listings support_tickets leads)
echo
echo "TABLE                  | PROD     | RESTORED | MATCH"
echo "-----------------------+----------+----------+------"
EXIT=0
for t in "${TABLES[@]}"; do
  PROD=$(PGPASSWORD="$PG_PW" psql -U "$PG_USER" -h 127.0.0.1 -d "$PROD_DB" -tAc "SELECT COUNT(*) FROM $t" 2>/dev/null || echo "—")
  REST=$(PGPASSWORD="$PG_PW" psql -U "$PG_USER" -h 127.0.0.1 -d "$TEST_DB" -tAc "SELECT COUNT(*) FROM $t" 2>/dev/null || echo "—")
  MATCH="✓"
  if [ "$PROD" != "$REST" ]; then
    MATCH="✖"
    EXIT=3
  fi
  printf "%-22s | %-8s | %-8s | %s\n" "$t" "$PROD" "$REST" "$MATCH"
done
echo

if [ "$EXIT" -ne 0 ]; then
  echo "✖ restore drill FAILED — row counts diverged"
  exit "$EXIT"
fi

echo "✓ restore drill PASSED — backup is healthy and restorable"
