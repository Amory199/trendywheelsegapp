# TrendyWheels — Operations Runbook

## Table of Contents
1. [First-time VPS Setup](#first-time-vps-setup)
2. [Deploy](#deploy)
3. [Rollback](#rollback)
4. [Backup & Restore](#backup--restore)
5. [Incident Response](#incident-response)
6. [Scaling](#scaling)

---

## First-time VPS Setup

**Prerequisites:** Ubuntu 24.04 VPS, root SSH access, domain DNS pointing to VPS IP.

```bash
# 1. Run the automated setup script (from your local machine)
ssh root@213.136.67.218 'bash -s' < infra/scripts/setup-server.sh

# 2. Configure Nginx vhosts + get SSL certs (run on VPS as deploy user)
sudo certbot --nginx \
  -d api.trendywheelseg.com \
  -d support.trendywheelseg.com \
  -d inventory.trendywheelseg.com \
  -d cdn.trendywheelseg.com \
  -d analytics.trendywheelseg.com

# 3. Copy .env files to VPS
scp apps/api/.env.production deploy@213.136.67.218:/opt/trendywheels/apps/api/.env
scp infra/.env.production deploy@213.136.67.218:/opt/trendywheels/infra/.env

# 4. Run first deploy
ssh deploy@213.136.67.218 '/opt/trendywheels/infra/scripts/deploy.sh'

# 5. Set up backup cron (on VPS)
echo "0 2 * * * deploy /opt/trendywheels/infra/scripts/backup.sh >> /var/log/trendywheels/backup.log 2>&1" | sudo tee /etc/cron.d/trendywheels-backup

# 6. Verify everything is running
pm2 list
curl https://api.trendywheelseg.com/healthz
```

---

## Deploy

**Automatic:** Push to `main` branch — GitHub Actions SSH to VPS and runs `deploy.sh`.

**Manual:**
```bash
ssh deploy@213.136.67.218 '/opt/trendywheels/infra/scripts/deploy.sh'
```

**What `deploy.sh` does:**
1. `git pull origin main`
2. `pnpm install --frozen-lockfile`
3. Turbo build: api, support, inventory
4. `prisma migrate deploy` (zero-downtime, additive only)
5. `pm2 reload ecosystem.config.js --env production` (rolling reload, no downtime)
6. Health check against `localhost:4000/healthz`

**Admin dashboard** deploys separately via Vercel (auto on push to main, paths: `apps/admin/**`).

**Mobile app** builds via EAS (manual trigger or push to main when `apps/mobile/**` changes).

---

## Rollback

### API / Support / Inventory (VPS)

```bash
ssh deploy@213.136.67.218

# Find the last known-good commit
git -C /opt/trendywheels log --oneline -10

# Roll back to specific commit
git -C /opt/trendywheels checkout <commit-hash>
cd /opt/trendywheels
pnpm install --frozen-lockfile
pnpm turbo run build --filter=@trendywheels/api --filter=@trendywheels/support --filter=@trendywheels/inventory
pm2 reload ecosystem.config.js --env production
```

### Admin (Vercel)

1. Go to Vercel dashboard → trendywheels-admin → Deployments
2. Find last good deployment → click "..." → "Promote to Production"

### Mobile

OTA updates can be rolled back:
```bash
eas update:rollback --branch production
```

Full rollback: submit previous build to App Store / Play Store.

---

## Backup & Restore

### Create manual backup

```bash
ssh deploy@213.136.67.218 '/opt/trendywheels/infra/scripts/backup.sh'
```

### List backups

```bash
ssh deploy@213.136.67.218 'mc ls local/backups/postgres/ | tail -20'
```

### Restore from backup

```bash
ssh deploy@213.136.67.218

# Download the backup file
mc cp local/backups/postgres/trendywheels_2026-04-21.sql.gz /tmp/

# Stop the API to prevent writes during restore
pm2 stop trendywheels-api

# Restore
gunzip -c /tmp/trendywheels_2026-04-21.sql.gz | psql -U trendywheels trendywheels

# Restart
pm2 start trendywheels-api
```

---

## Incident Response

### API is down (`/healthz` returns 5xx or no response)

```bash
ssh deploy@213.136.67.218

# Check PM2 status
pm2 list
pm2 logs trendywheels-api --lines 100

# Restart if crashed
pm2 restart trendywheels-api

# Check if DB is reachable
psql -U trendywheels -c "SELECT 1;"

# Check if Redis is reachable
redis-cli -a <password> ping
```

### Database connection pool exhausted

```bash
# Check active connections
psql -U postgres -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'trendywheels';"

# Identify long-running queries
psql -U postgres -c "SELECT pid, now() - pg_stat_activity.query_start AS duration, query FROM pg_stat_activity WHERE state = 'active' ORDER BY duration DESC LIMIT 10;"

# Kill specific connection if needed
psql -U postgres -c "SELECT pg_terminate_backend(<pid>);"
```

### High memory usage

```bash
# Check memory per process
pm2 monit

# If API is leaking, restart it
pm2 restart trendywheels-api

# Check Docker containers (MinIO + Plausible)
docker stats --no-stream
```

### SSL certificate expired

```bash
sudo certbot renew --dry-run  # Test first
sudo certbot renew
sudo systemctl reload nginx
```

Certbot auto-renews via cron (`/etc/cron.d/certbot`). If that failed, run manually above.

### Disk space full

```bash
df -h  # Check usage

# Clean old PM2 logs
pm2 flush

# Clean old backups manually
mc ls local/backups/postgres/ | awk '{print $NF}' | head -n -30 | xargs -I{} mc rm local/backups/postgres/{}

# Clean Docker images
docker image prune -f
```

---

## Scaling

The VPS (20GB SSD, Ubuntu 24.04) can handle ~500 concurrent users. If you outgrow it:

### Vertical scaling (simpler)
Upgrade VPS to next tier (more RAM/CPU) — data persists, same IP, restart services.

### Horizontal scaling (when needed)
1. Separate PostgreSQL to a managed DB (Supabase, RDS)
2. Move Redis to managed service (Upstash)
3. Move MinIO to S3
4. Use load balancer in front of multiple API instances (already configured in `ecosystem.config.js` with `instances: 2`)
5. Admin → already on Vercel (serverless, auto-scales)
6. Support/Inventory → containerize and deploy to Railway or Fly.io

### Database indexes to add before >10k users

```sql
-- Run these if query performance degrades:
CREATE INDEX CONCURRENTLY idx_bookings_user_created ON bookings(user_id, created_at DESC);
CREATE INDEX CONCURRENTLY idx_repair_requests_user_status ON repair_requests(user_id, status);
CREATE INDEX CONCURRENTLY idx_messages_conversation ON messages(conversation_id, created_at ASC);
CREATE INDEX CONCURRENTLY idx_vehicles_status_type ON vehicles(status, type);
```

Run `EXPLAIN ANALYZE` on slow queries first to confirm the index helps.

---

## Security Findings Log (2026-04-24 audit)

### Fixed in-session
- **[IDOR / messages]** `listMessages` and `markRead` now call `assertParticipant(conversationId, userId)` before any read/write. Any user attempting to list/mark messages for a conversation they are not a participant of gets `403 Forbidden`. Fix: `apps/api/src/modules/messages/controller.ts`.
- **[Logger redaction]** Expanded pino `redact.paths` to cover `phone`, `phoneNumber`, `email`, `tokenHash`, `otpHash`, `passwordHash`, `cookie`. Was missing PII fields that OTP flow emitted. Fix: `apps/api/src/utils/logger.ts`.

### Deferred — known, non-blocking for launch

1. **localStorage JWT storage (admin / support / inventory)** — `apps/*/src/lib/api.ts`. Access + refresh tokens currently in `localStorage`. Any XSS on these dashboards exposes the session. Not blocking launch because: (a) admin dashboards are staff-only behind Cloudflare (once SSL is live), (b) no user-generated HTML is rendered. **Plan for v1.1**: migrate to `httpOnly; Secure; SameSite=Lax` cookies via API `Set-Cookie` on login; remove `localStorage.setItem` calls; add CSRF token endpoint. Est. 1 day per dashboard + API cookie middleware.

2. **Refresh-token lookup O(n)** — `apps/api/src/modules/auth/service.ts` `refreshAccessToken()` fetches all valid refresh tokens and bcrypt-compares in a loop. Works fine up to ~10k active tokens; after that, response time degrades linearly. **Plan**: either include `userId` in the refresh-token body (client-side storage pattern) so we can `WHERE userId = ...` narrow down before bcrypt, or switch to signed JWT refresh tokens with a server-side revocation list.

3. **Helmet default CSP only** — Not a regression; defaults are restrictive and block inline scripts. If any future page needs inline script (unlikely with Next.js), we'll add a specific `scriptSrc` allowlist.

### Security defenses already in place
- Helmet with default CSP + `x-powered-by` off
- CORS explicit allowlist from `CORS_ORIGINS` env
- `express-rate-limit`: global 100 req/min + auth 5 req/15min per IP
- Nginx rate limits as defense-in-depth
- Bcrypt cost 12 on passwords + refresh-token hashes
- Zod body validation on every auth route
- Prisma parameterized queries (no raw SQL in the codebase)
- GDPR: `GET /api/users/:id/export` (owner-scoped), `DELETE /api/users/:id` (soft-delete + PII anonymization)
- No footguns: no `eval`, no `Function()`, no client-settable `role` accepted on user endpoints

### Recurring tasks
- Daily: Postgres dump cron (02:00) → MinIO `backups/postgres/`, 30-day retention
- Weekly: `pnpm audit --audit-level=high` manually until wired into CI
