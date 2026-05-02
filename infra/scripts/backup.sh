#!/usr/bin/env bash
# Daily PostgreSQL backup → gzip → MinIO.
# Add to cron: 0 2 * * * /opt/trendywheels/infra/scripts/backup.sh >> /var/log/trendywheels/backup.log 2>&1
set -euo pipefail

# Load infra/.env so MINIO_ROOT_USER/PASSWORD are picked up by cron jobs.
if [ -f /opt/trendywheels/infra/.env ]; then
  set -a
  # shellcheck disable=SC1091
  . /opt/trendywheels/infra/.env
  set +a
fi

TIMESTAMP=$(date '+%Y-%m-%d_%H-%M-%S')
BACKUP_FILE="/tmp/trendywheels-${TIMESTAMP}.sql.gz"
MINIO_BUCKET="backups"
MINIO_ALIAS="local"
RETENTION_DAYS=30

echo "=== Backup ${TIMESTAMP} ==="

# Dump and compress
PGPASSWORD="${POSTGRES_PASSWORD:-trendywheels}" \
  pg_dump -U trendywheels -h 127.0.0.1 trendywheels | gzip > "$BACKUP_FILE"

SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
echo "→ Backup created: $BACKUP_FILE ($SIZE)"

# Upload to MinIO via mc (MinIO client)
if command -v mc &>/dev/null; then
  mc alias set "$MINIO_ALIAS" http://localhost:9000 \
    "${MINIO_ROOT_USER:-minioadmin}" \
    "${MINIO_ROOT_PASSWORD:-minioadmin}" --quiet

  # Ensure bucket exists
  mc mb --ignore-existing "${MINIO_ALIAS}/${MINIO_BUCKET}"

  mc cp "$BACKUP_FILE" "${MINIO_ALIAS}/${MINIO_BUCKET}/postgres/$(basename "$BACKUP_FILE")"
  echo "→ Uploaded to MinIO: ${MINIO_BUCKET}/postgres/$(basename "$BACKUP_FILE")"

  # Delete files older than retention days
  mc find "${MINIO_ALIAS}/${MINIO_BUCKET}/postgres/" \
    --older-than "${RETENTION_DAYS}d" --name "*.sql.gz" | \
    xargs -I{} mc rm {} 2>/dev/null || true
  echo "→ Old backups pruned (>${RETENTION_DAYS} days)"
else
  echo "⚠ mc (MinIO client) not found — backup stored locally only: $BACKUP_FILE"
fi

# Clean up local temp file
rm -f "$BACKUP_FILE"
echo "✓ Backup complete"
