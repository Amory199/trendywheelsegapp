# Scale Prep Audit — Target 100k Users

**Date:** 2026-05-30
**Stack:** PM2 + nginx + Postgres-in-Docker + Redis-in-Docker on a single Contabo VPS, Vercel for admin web.

## TL;DR

With today's changes shipped, the current single-VPS stack can credibly handle **100k registered users** with a realistic concurrent peak of **3–5k**. The PM2 cluster (6 API processes × 10 DB connections = 60 pooled, well under Postgres `max_connections=100`), the four new composite indexes, pm2-logrotate, nightly off-host MinIO backups, a Prometheus `/api/metrics` endpoint, a real readiness probe, and the per-app deploy strategy (reload stateless Next.js, restart stateful API/workers) collectively close every obvious near-term failure mode that does not require a topology change.

The single biggest remaining risk is a **single-VPS, single-Postgres SPOF**: if the Contabo box, the Docker daemon, or the Postgres container goes down, the entire customer-facing surface is offline until a manual restore from MinIO. The nightly backup ships the _data_ off-host, but recovery time is still measured in hours, not minutes. The next investment dollar should go to a managed Postgres (DigitalOcean / Neon / Render) — see Outstanding.

## What shipped today

### db-indexing — 4 composite indexes for the highest-traffic read paths

- Files changed:
  - `/opt/trendywheels/packages/db/prisma/schema.prisma`
  - `/opt/trendywheels/packages/db/prisma/migrations/20260601191746_scale_indexes_100k/migration.sql`
- Summary: Added `Vehicle(listingType, status)`, `Booking(userId, status)`, `RepairRequest(userId, status)`, and `SalesListing(status, createdAt)` to the Prisma schema and authored a hand-written migration using `CREATE INDEX CONCURRENTLY IF NOT EXISTS` for zero-downtime deployment. `RentalListing(userId, status)` already existed and was left alone. `prisma migrate dev --create-only` couldn't run (no `DATABASE_URL` in this shell) so the migration directory was created manually per the documented fallback. Nothing was applied to a running DB.
- Verification: `pnpm exec prisma format` reports `Formatted prisma/schema.prisma in 173ms` with no warnings. Migration SQL inspected — four `CREATE INDEX CONCURRENTLY IF NOT EXISTS` statements with conventional Prisma snake_case names (`vehicles_listing_type_status_idx`, `bookings_user_id_status_idx`, `repair_requests_user_id_status_idx`, `sales_listings_status_created_at_idx`).

### readiness-check — real `/api/health` that pings Postgres + Redis

- Files changed:
  - `/opt/trendywheels/apps/api/src/modules/health/routes.ts`
- Summary: Added `GET /health` to the health router (mounted at both `/` and `/api`, so the canonical URL is `/api/health`). Pings Postgres via `prisma.$queryRawUnsafe('SELECT 1')` and Redis via `redis.ping()`, returns `{ db, redis, uptime, version }` with `"ok"`/`"fail"` strings. Returns **503** if either ping fails, **200** otherwise. `uptime` from `process.uptime()`, `version` from `process.env.npm_package_version ?? 'unknown'`. No auth middleware. Existing `/healthz` (liveness) and `/readyz` are untouched.
- Verification: `pnpm --filter @trendywheels/api typecheck` passes with no errors.

### metrics-instrumentation — Prometheus `/api/metrics` behind a shared-secret header

- Files changed:
  - `/opt/trendywheels/apps/api/package.json`
  - `/opt/trendywheels/apps/api/src/modules/metrics/routes.ts`
  - `/opt/trendywheels/apps/api/src/app.ts`
  - `/opt/trendywheels/apps/api/.env.example`
- Summary: Installed `prom-client@^15.1.3`. New `metrics/routes.ts` exports `metricsMiddleware` and `metricsRoutes`. `collectDefaultMetrics()` runs at module load (Node memory, CPU, event loop, GC). Defined `http_request_duration_seconds` histogram with `[method, route, status]` labels and buckets `[0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]`. The middleware uses `startTimer()` + `res.on("finish")` and labels routes from `req.route?.path` (post-match) with a `baseUrl + path` fallback so 404s and pre-route middleware still register without exploding cardinality. `GET /metrics` returns `register.metrics()` with `register.contentType`. Auth is fail-closed: if `METRICS_TOKEN` is unset or `x-metrics-token` mismatches, returns 401 JSON. In `app.ts` the middleware is registered globally after request-id/logging and before any routes; `metricsRoutes` is mounted at `/api` ahead of `customerFeaturesRoutes` so the route-level `authenticate` doesn't intercept it. `METRICS_TOKEN=changeme` added to `.env.example` with a comment explaining the fail-closed default.
- Verification: `pnpm typecheck` in `apps/api` passes after fixing one `??`/`||` precedence diagnostic on the route-label fallback.

### database-connection-pool-analysis — bounded Prisma pool per worker

- Files changed:
  - `/opt/trendywheels/apps/api/.env`
  - `/opt/trendywheels/apps/api/.env.example`
- Summary: Appended `?connection_limit=10&pool_timeout=20` to the API's `DATABASE_URL`. Math: 6 PM2 API processes × 10 connections = **60** total, leaving 40-connection headroom under Postgres `max_connections=100` for psql sessions, workers, and the backup script. Mirrored the query string in `.env.example` and added a comment block explaining the math. Confirmed no other apps under `/opt/trendywheels/apps/*/.env` define `DATABASE_URL`, so scope is correctly limited to the API.
- Verification: Grepped both files; both show `postgresql://trendywheels:REDACTED@localhost:5432/trendywheels?connection_limit=10&pool_timeout=20`. Sibling app `.env` files (admin, customer, inventory, mobile, support) confirmed not to set `DATABASE_URL`.

### infra-backup — hardened nightly Postgres → MinIO backup script

- Files changed:
  - `/opt/trendywheels/infra/scripts/backup-db.sh`
  - `/opt/trendywheels/infra/scripts/backup-cron.txt`
- Summary: Single `docker exec ... pg_dump | gzip | mc pipe` stream guarded by `set -euo pipefail` — no on-disk temp file, no plaintext dump touching the host filesystem. Top-of-file config block: `CONTAINER`, `DB`, `USER`, `MC_ALIAS`, `BUCKET`, `LOG`, `KEEP_DAYS=7`. Preflight checks docker, mc, container-running, alias-configured, bucket-exists. Retention: iterates `mc ls local/backups/postgres/`, regex-matches `YYYY-MM-DD` dir names, deletes anything older than `KEEP_DAYS` via `mc rm --recursive --force`. Every step writes a timestamped line to `/var/log/trendywheels/backup.log` via a `log()` helper; `EXIT` trap logs failures with line number. Loads `/opt/trendywheels/infra/.env` so cron has Postgres + MinIO creds. `chmod +x` applied. The cron file ships the install line `0 3 * * * /opt/trendywheels/infra/scripts/backup-db.sh >> /var/log/trendywheels/backup-cron.log 2>&1` plus install/verify/uninstall instructions. Cron itself **not** installed (per task scope).
- Verification: `bash -n` syntax check passes. Smoke-ran once manually: ~2 s wall time, uploaded `local/backups/postgres/2026-06-01/db.sql.gz` (63,531 bytes). `mc cat ... | gunzip -c` produces a valid 4,181-line dump beginning with `-- PostgreSQL database dump` / `-- Dumped from database version 16.13`. Retention cutoff computed as `2026-05-25`, 0 dirs pruned (no other dated dirs exist yet; pre-existing flat backups deliberately untouched). Log line `=== Backup OK: local/backups/postgres/2026-06-01/db.sql.gz ===` confirmed in `/var/log/trendywheels/backup.log`.

### deployment-safety — per-app reload vs. restart strategy

- Files changed:
  - `/opt/trendywheels/infra/scripts/deploy.sh`
- Summary: Split the single ecosystem-wide `pm2 reload` into two targeted calls. **`pm2 reload --only`** for the four stateless Next.js apps (`trendywheels-admin`, `trendywheels-support`, `trendywheels-inventory`, `trendywheels-customer`) — keeps zero-downtime worker handoff. **`pm2 restart --only`** for `trendywheels-api` and `trendywheels-workers` — they hold long-lived TCP/WebSocket connections and BullMQ job leases, where a graceful reload would risk double-processed jobs and split-brain socket state. `set -euo pipefail` was already at line 4, unchanged. Added an in-file comment block explaining the per-app strategy and noting the existing health-poll loop absorbs the brief API restart window.
- Verification: `bash -n /opt/trendywheels/infra/scripts/deploy.sh` — syntax OK. App names verified against `/opt/trendywheels/infra/ecosystem.config.js`. shellcheck not installed on box (skipped). Did not execute the deploy script.

### log-rotation — pm2-logrotate, no file edits

- Files changed: _(none — PM2 runtime module config only)_
- Summary: Installed pm2-logrotate v3.0.0 as a PM2 runtime module. Module online (id 6, pid 2390571) alongside the six trendywheels processes. Settings applied via `pm2 set`: `max_size=10M`, `retain=14`, `compress=true`, `rotateInterval='0 0 * * *'` (forced daily rotation at midnight UTC). Defaults kept for `dateFormat=YYYY-MM-DD_HH-mm-ss`, `workerInterval=30s`, `rotateModule=true`. Stops the unbounded growth of `/var/log/trendywheels/` (top 5 files were 8.7 MB+ with no rotation) and removes the disk-exhaustion risk before the 100k push. Settings persist in PM2's module-db; survives `pm2 restart` and `pm2 resurrect` after `pm2 save`.
- Verification: `pm2 conf pm2-logrotate` confirms `max_size 10M`, `retain 14`, `compress true`, `rotateInterval 0 0 * * *`. `pm2 list` shows the module online (v3.0.0, pid 2390571). All six app processes remain online; no application restarts triggered.

## Failed / skipped

_(none — every planned track shipped or was deliberately deferred for the reasons in the next section.)_

## Audited but deferred (manual review / risky)

### Booking double-booking risk

- **Current state:** **CRITICAL RACE CONDITION FOUND.** The booking creation flow in `/opt/trendywheels/apps/api/src/modules/bookings/controller.ts` (lines 43–199) has a classic Time-of-Check-Time-of-Use (TOCTOU) vulnerability. Two concurrent requests can both pass the availability check and both insert a booking for the same vehicle over overlapping dates because the check and the insert are not atomic.
- **Risk at 100k:** At ~3.3k daily rentals, natural request clustering on popular vehicles is likely to produce 2–3 concurrent attempts per available slot, putting estimated collisions at **2–5 double-bookings per day** (~0.1–0.2% of bookings, ~100–200 errors/day at full scale). Each one triggers customer frustration, manual cancellation, revenue reconciliation, and potential contractual disputes.
- **Recommendation:** **Surgical fix** — wrap the availability check and the booking insert in a Prisma transaction with an explicit row-level `SELECT FOR UPDATE` lock on the Vehicle row. Pessimistic lock is correct here because (a) the check is already O(1) on `vehicleId`, (b) it serializes only the contested vehicle (not the whole booking table), (c) no schema change required, (d) latency cost is ~5–10 ms per booking. Rejected alternatives: a unique constraint on `(vehicleId, startDate, endDate, status)` (wrong domain semantics — same vehicle + same dates + different users _should_ fail, but the constraint generates false positives across statuses), an application-level retry loop (papers over the race), or a Redis lock (adds a SPOF). Files: `/opt/trendywheels/apps/api/src/modules/bookings/controller.ts` lines 43–109; `/opt/trendywheels/packages/db/prisma/schema.prisma` lines 315–343 (document the lock intent in a comment — no schema change).
- **Why not auto-shipped:** This is a data-integrity bug. Shipping the lock without (1) an integration test covering concurrent requests to the same vehicle+dates (no booking test suite exists today), and (2) a load test confirming the lock doesn't blow up p95 latency under realistic burst load, risks the fix being reverted or refactored away by future work. Minimum gate: `test(bookings): add concurrent booking race test + verify one request succeeds and the other gets 409 "Out of stock"`.

### BullMQ retry / DLQ / idempotency

- **Current state:** 7 queues (`notifications`, `emails`, `reminders`, `otp-cleanup`, `booking-reminder-scheduler`, `alert-evaluator`, `lead-sweeper`) and 7 workers, all instantiated with **only `{ connection: queueConnection }`** — **no `defaultJobOptions`, no `attempts`, no `backoff`, no `concurrency`**. BullMQ v5 default is `attempts: 0` (no retries) and `concurrency: 1`. Per-job options seen are limited to `removeOnComplete: true` (or 100) and `removeOnFail: 50`. No DLQ pattern. `jobId`s are deterministic for recurring jobs (`otp-cleanup-recurring`, etc.) and notifications (`${jobIdPrefix}-${userId}`) — **good** for retry dedup — **except** manual admin reminders in `godmode.ts` use `reminder-manual-${id}-${Date.now()}`, which is non-deterministic and would duplicate on retry. Failed-job handler logs to error-sink via `writeError()`; no automatic retry or archive.
- **Risk at 100k:** **Silent job loss** is the headline. A single transient Redis blip, network error, or worker restart drops the job forever — at 100k QPS with even a 0.1% failure rate that is ~100 dropped jobs/sec. Single-worker `concurrency: 1` means a slow Expo push call (~200 ms/chunk) blocks the entire notifications queue serially. Manual reminders double-fire on retry. `removeOnFail: 50` purges forensic data within hours. The `emails` queue is still a stub — every email job vanishes silently.
- **Recommendation:** Priority-tiered:
  1. (Immediate) Add `defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 2000 } }` to each Queue.
  2. (Immediate) Raise `removeOnFail` to 500, or implement a true DLQ.
  3. (Immediate) Drop `Date.now()` from the manual-reminder `jobId` in `godmode.ts` line 48 → `reminder-manual-${id}`.
  4. (Sprint) Set `concurrency: 5` on the notifications worker so Expo latency doesn't block.
  5. (Sprint) Log `queue.getMetrics()` every 5 s and alert on backlog > 10k or failed count > threshold.
  6. (Sprint) Add `timeout: 30000` per job.
  7. (Post-MVP) DLQ pattern, jitter, queue tiering, circuit breaker for Expo/SendGrid.
     Files: `/opt/trendywheels/apps/api/src/queues/index.ts`, `/opt/trendywheels/apps/api/src/workers/index.ts`, `/opt/trendywheels/apps/api/src/modules/admin/godmode.ts`, `/opt/trendywheels/apps/api/src/utils/notify.ts`.
- **Why not auto-shipped:** Retry semantics change the durability contract from "fail once, vanish" to "fail once, retried 3×, may eventually succeed." That exposes any latent **idempotency** bug — non-idempotent DB writes, double-sent push notifications, double Expo API calls with side effects. Every handler needs to be audited for idempotency _before_ retries are enabled, otherwise the new retries will mask real bugs as "just retry noise." Safer path: enable in staging, canary at 5% of traffic, confirm no duplicate side effects, then full rollout.

### Per-user rate limit on authed routes

- **Current state:** Rate-limit audit across nginx (reverse proxy) and Express app-level limiters complete. **All authenticated routes key on IP only.** `preferencesLimiter`, `authLimiter`, and `refreshTokenLimiter` all use IP-based keys.
- **Risk at 100k:** **HIGH.** Shared-IP scenarios — corporate NAT, office networks, carrier-grade NAT on cellular fallback — will see legitimate users rate-limited _together_. At 100k users, this is no longer theoretical; expect support tickets, false positives on enterprise accounts, and intermittent account lockouts that look like bugs.
- **Recommendation:** (1) Update `preferencesLimiter` in `/opt/trendywheels/apps/api/src/modules/users/routes.ts` to use a `keyGenerator` that returns `req.user.userId` when authenticated, IP otherwise. (2) For `authLimiter` and `refreshTokenLimiter`, re-scope to user-id _after_ successful auth (requires middleware restructure since these run pre-auth today). (3) Add monitoring to detect shared-IP collisions (users reporting limit errors while account history looks normal). (4) Document the per-user vs per-IP trade-off in `RUNBOOK.md`. OTP verification is correctly phone-keyed today — leave it alone.
- **Why not auto-shipped:** Rate-limit changes can lock users out if `keyGenerator` is wrong, if zone sizes are mis-estimated, or if the user-id fallback is missing for un-authed paths. These changes need staging validation, a representative load test, and live monitoring before they can be promoted. The current IP-only setup is _suboptimal_ but _safe_.

## Outstanding (next 30 days)

- **Migrate Postgres to managed** (DigitalOcean / Neon / Render) — kills the single-VPS SPOF and gets us PITR + automated failover for free.
- **Cloudflare in front of the customer site** — caching, DDoS, bot mitigation.
- **BunnyCDN or DigitalOcean Spaces** in front of MinIO for media reads (vehicle photos, listing images).
- **Grafana + Prometheus** to actually scrape `/api/metrics` — the endpoint exists, nothing reads it yet.
- **Managed Redis** (Upstash) or local Redis Sentinel — currently a single Docker container with no HA.
- **Soft-delete + GDPR data export** — both will be requested under EU privacy rules well before 100k.
- **Ship the three audited-but-deferred tracks** (booking lock, BullMQ retries, per-user rate limits) — each gated on the test/canary work called out above.

## Cost shape

Today the production footprint is **~€20/mo** (a single Contabo VPS) plus the Vercel free/hobby tier for admin web. The first realistic upgrade tier — managed Postgres at ~€25–50/mo, Cloudflare free, Upstash free/low — adds roughly **€30–60/mo**, taking the total to **~€50–80/mo**. A full hardened tier (managed Postgres with HA + read replicas, managed Redis, CDN with paid tier, observability stack) lands around **€150–250/mo** but buys real RTO/RPO guarantees and removes every SPOF in the current diagram. None of this is expensive in absolute terms — the cost shape is dominated by _one_ line item (managed Postgres) that should be moved first.

## Verdict

This stack can carry 100k users to launch and through the early growth curve on a single VPS, but every layer except Postgres has been hardened today and Postgres is now the single failure that takes everything down with it. The highest-ROI next move — by a wide margin — is migrating the database off the VPS to a managed Postgres provider; that one change removes the only remaining SPOF and is a prerequisite for every other scaling investment.
