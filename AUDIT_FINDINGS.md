# Audit findings — 2026-05-28

Three parallel audits (API, web/mobile, infra/DB/deps/observability) returned ~115 raw findings. After de-duplication and verification, the actionable set is **~60**. Quick fixes landed inline in this commit. The rest are tracked as INC-012 through INC-021 — each will get its own focused track.

This file is the single source of truth for what audit said vs what was actually verified. When triaging future audit runs (`/security-review` or full sweeps), update statuses here rather than forking new lists.

## How to read this

- ✅ **Fixed in this audit** — code change in the same commit. Note the commit + INC reference if one was created.
- 📋 **Tracked as INC** — too big for one commit; will land in a follow-up track.
- ❌ **False positive** — verified to not apply or already mitigated. Reason explained.
- ⏸ **Deferred** — real but not pre-launch critical, scheduled for post-launch.

---

## Verified-and-fixed inline (this commit)

### ✅ Refresh-token endpoint had no rate limit

- **Source:** API audit finding #1 (P0)
- **Fix:** Added `refreshTokenLimiter` (60 req / 15 min per IP) in `apps/api/src/app.ts`. Mounted on `/api/auth/refresh-token` before the router.
- **Residual risk:** The lookup itself still scans all active refresh tokens. Tracked as INC-012 — rate limit bounds DoS exposure until the lookup is rewritten.

### ✅ `ENABLE_TRIAL_OTP_BYPASS` could be accidentally true in production

- **Source:** API audit finding #25 (P3, escalated because impact is total auth bypass)
- **Fix:** Startup guard in `apps/api/src/server.ts` — if `NODE_ENV === "production"` and the flag is true, log and `process.exit(1)`. Process supervisor (PM2) will surface the failure immediately.

### ✅ Redis ran without AOF persistence

- **Source:** Infra audit finding #5 (escalated P0 — silent data loss on crash)
- **Fix:** `infra/docker-compose.yml` Redis `command:` now includes `--appendonly yes --appendfsync everysec`. Documented why in an inline comment.
- **Note:** Applies to local dev only; production VPS Redis runs natively, ops team must mirror the change in `/etc/redis/redis.conf` (`appendonly yes`, `appendfsync everysec`). RUNBOOK update tracked under INC-020.

### ✅ No request-ID correlation across logs

- **Source:** API audit finding #27 (P3, escalated because debugging gets exponentially harder without it)
- **Fix:** Middleware in `apps/api/src/app.ts` that reads `x-request-id` from upstream (nginx, Vercel edge) or generates a UUID, attaches to `req.id`, sets response header `X-Request-ID`, and includes in the request-logging line. Wiring into worker logs + Sentry context tracked under INC-013.

### ✅ INC-009 — `/api/health` returned 401

- **Source:** Pre-existing INC, also flagged by infra audit #46
- **Fix:** Mounted `healthRoutes` at `/api` in addition to `/`. External monitors hitting either path get the same response. Closes INC-009.

---

## Big-track work (will land in follow-up commits)

| INC     | Severity | Audit finding                 | Title                                                                                    | Track shape                                                                                                                                 |
| ------- | -------- | ----------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| INC-012 | P0       | API #2                        | Refresh-token lookup scans all active tokens (CPU DoS)                                   | Embed user ID in refresh token + Prisma filter scoped to that user. ~half-day.                                                              |
| INC-013 | P1       | API #4                        | Access-token revocation missing                                                          | Add Redis-backed bloom filter for revoked-token sigs, check in `authenticate` middleware. ~half-day.                                        |
| INC-014 | P1       | Infra #2,#11                  | Cascade delete on `User → Booking/Notification` destroys audit/revenue records           | Schema migration: `onDelete: SetNull` + nullable `userId`, anonymize on user-delete. ~half-day + migration.                                 |
| INC-015 | P1       | Infra #14                     | No soft-delete on `User` (GDPR / Play Store deletion request can't preserve audit trail) | Add `deletedAt`, query-everywhere filter, deletion-request worker. ~1 day + migration.                                                      |
| INC-016 | P1       | Infra #1,#2,#3,#4,#6,#7       | Composite indexes missing on hot query paths                                             | Single Prisma migration adding `@@index` for ~8 hot pairs. ~1 hr + migration.                                                               |
| INC-017 | P1       | API #8, Infra #18,#19,#20,#21 | BullMQ workers lack retry/concurrency/idempotency/DLQ                                    | One-line per worker for retry+concurrency; DLQ + idempotency keys = larger refactor. ~half-day.                                             |
| INC-018 | P1       | API #5,#6,#7                  | Mass-assignment in `sales`, `repairs`, `kb` controllers                                  | Replace `...req.body` with explicit picks across 3 controllers. ~1 hr.                                                                      |
| INC-019 | P1       | Mobile #1, web findings       | localStorage token storage (XSS escalation)                                              | Migrate web auth to httpOnly cookies + CSRF token; mobile already on SecureStore. Significant track — touches 4 Next apps + API. ~1–2 days. |
| INC-020 | P1       | Infra #4,#5,#6,#8,#41,#44,#45 | Single-instance Postgres + Redis = SPOF; no uptime monitor; no secret rotation runbook   | RUNBOOK updates + UptimeRobot setup are <1hr; HA Postgres is post-launch infra.                                                             |
| INC-021 | P2       | Mobile #7                     | No certificate pinning on mobile API calls                                               | `react-native-cert-pinner` + pinned leaf cert. Needs key-rotation runbook so we don't brick clients. ~half-day + ops doc.                   |

---

## False positives / already mitigated

| Audit finding                                                                   | Why it's not an issue                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mobile #15 — `google-services.json` / `GoogleService-Info.plist` tracked in git | **False.** All four sensitive files are gitignored at `apps/mobile/.gitignore:10-11` (credentials) and `.gitignore:61-62` (Google config). `git log --all` confirms zero history. Auditor saw on-disk presence and assumed tracked.                                                                                                                  |
| Mobile #24 — `credentials.json` tracked in git                                  | Same as above.                                                                                                                                                                                                                                                                                                                                       |
| Mobile #2 — trial OTP bypass codes in mobile source                             | **Partial.** Mobile holds _phone numbers_ for routing, not OTP codes. The OTP codes live in `apps/api/src/modules/auth/service.ts` and are gated by `env.ENABLE_TRIAL_OTP_BYPASS` (defaults false). Hardening fix landed inline above (startup guard). Followup track: move hardcoded test phones to Firebase Test Phones feature instead of source. |
| API #33 — hardcoded test OTPs in production                                     | Same as above — gated by env flag, now also blocked at startup.                                                                                                                                                                                                                                                                                      |
| INC-009 — `/api/health` returns 401                                             | Mounted at `/api` in addition to root in this commit. Closes INC.                                                                                                                                                                                                                                                                                    |
| INC-005 — `VEHICLE_CATEGORY_MAP` duplication                                    | Workaround acknowledged; extraction is a P3 cleanup track waiting for a 3rd caller to justify the lift.                                                                                                                                                                                                                                              |
| INC-011 — mobile screens with `as unknown as <T>` casts                         | Open, tracked. Same priority as before.                                                                                                                                                                                                                                                                                                              |
| API #14 — Firebase ID token in error logs                                       | Already redacted in the existing Pino redaction list. Re-verified after the audit.                                                                                                                                                                                                                                                                   |
| Infra #28 — Pino version                                                        | Current `pino@9.0.0` is fine; no known CVEs. Routine upgrade later.                                                                                                                                                                                                                                                                                  |
| Infra #25 — RN 0.79.6 mismatched with Expo 53                                   | Already on the Expo 53 → 54 deferral track; not blocking.                                                                                                                                                                                                                                                                                            |

---

## Deferred (post-launch)

| Finding                                           | Why later                                                                                                                     |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| API #28 — CAPTCHA on failed login                 | Real risk but the existing 30/15min auth limiter handles current threat model. Add hCaptcha once we see actual abuse traffic. |
| Mobile #28 — jailbreak detection                  | UX tax for everyone to mitigate a small attacker population; defer until product-side decision.                               |
| Infra #16,#17 — Redis caching layer for hot paths | Postgres + connection pool handles current load. Revisit when read-only endpoints start showing > 50ms p99.                   |
| Infra #34 — BullMQ admin dashboard                | Nice-to-have; add when we hit operational pain.                                                                               |
| Infra #38 — log aggregation beyond stdout         | PM2 + writeError to disk works for now; centralized log sink (Papertrail / Better Stack) when team grows past 1 person.       |

---

## Re-audit — 2026-06-15 (`/security-review`, 4 parallel reviewers)

Triggered by `/security-review`. Four reviewers: live auth/token, `feat/social-auth` branch (adversarial), secrets/config/infra, authz/IDOR/validation. Cryptographic core verified sound (RS256 alg-pinned, bcrypt-rotated refresh, helmet+CSP+layered limits, pino redaction, no committed secrets, consistent object-ownership checks, no SQLi/XSS/SSRF). The real issues are config/feature backdoors and a few authz gaps.

### 🔴 NEW — Critical (tracked as INC-033)

- **Prod `STAFF_TEST_PHONES` + Firebase fixed-code test numbers → no-password superadmin.** `+201500001001` (seeded `staffRole:admin`, Firebase fixed code `100001`, both in tracked `seed.ts`) → `signInWithPhoneNumber`/`confirm` → `POST /api/auth/firebase-token` → superadmin JWT. Verified at code+config level; API warns at boot (`server.ts:94-97`). **Owner remediating** (empty env var + delete Firebase test numbers + rotate `Admin@123!` + recommended `NODE_ENV` code gate). See INC-033.

### 📋 Confirmed STILL LIVE (existing INCs, re-verified open this audit)

- **INC-018** — mass-assignment: a customer can `PUT /api/sales/:id` their own listing to `status:"active"` + arbitrary `price`, skipping staff approval (`sales/controller.ts:115`, raw `data: req.body`). Fix pattern already exists in `rental-listings/controller.ts`. Still open.
- **INC-012** — refresh-token lookup is an O(n) bcrypt scan over all active tokens (CPU DoS at scale). Still open; rate-limiter bounds it.
- **INC-013** — no access-token revocation: a stolen access token stays valid up to 24h (refresh revocation only bites at refresh time). Still open.
- **INC-019** — web tokens in localStorage (XSS escalation). Still open.

### 📨 NEW — lower severity, reported to owner (not yet INC-tracked)

- **HIGH** — staff/admin password login has NO second factor: `staffLoginSchema.totpCode` is accepted but never verified anywhere; seed sets published default passwords (`Admin@123!`/`Sales@123!`). (Folded into INC-033 remediation.)
- **MED** — a `staff` (sales) account can `POST /api/users/:id/disable` an **admin** → force-logout the admin team (`users/controller.ts:275`); no rank check on target.
- **MED** — prod `CORS_ORIGINS` includes `http://localhost:*` and `http://<rawIP>:*` with `credentials:true`.
- **MED** — refresh rotation is not transactional (crash between revoke+create = lockout) and has no token-reuse detection (stolen refresh token rolls forever). Extends INC-012/013.
- **LOW** — any user can DM/notify any `recipientId` (spam, `messages/controller.ts:59`); `POST /request-deletion` has no rate limit; godmode `GET /records/users` returns `passwordHash` to the admin client (no `select`).
- **(intentional)** — `ENABLE_TRIAL_OTP_BYPASS=true` in prod is the customer-scope `+201234567000`/`730284` review bypass; set `false` once Apple/Google reviews clear.

### ⏸ `feat/social-auth` branch — must fix BEFORE it ships (not deployed)

- Email not canonicalized before the auto-link `findUnique({where:{email}})` → duplicate/shadow-account + linking ambiguity (`service.ts:426-433`).
- Link ticket is not single-use (no `jti`) and not audience-pinned (the documented `aud="social-link"` doesn't exist — only a `kind` body claim; shares the access-token signing key). `service.ts:358-380`.
- `setPassword`/`confirmPasswordReset` revoke refresh tokens but don't kill outstanding access tokens (skips the revocation marker to dodge the same-second `iat` race; fix the marker as `freshIat-1` instead).
- Folds into the existing "re-apply session fix + harden before merge" track for that branch.

---

## How to extend this file

When `/security-review` or another audit returns new findings:

1. Scan this file first — many will be repeats. Update the existing entry's status instead of forking.
2. For genuinely new findings: add to the appropriate section (fixed / tracked / false positive / deferred) with the same shape.
3. If it warrants its own track, assign the next INC number in `INCIDENTS.md` and reference it from here.
4. Don't let this file rot. It dies if it diverges from reality.

Companion files:

- [INCIDENTS.md](./INCIDENTS.md) — per-incident postmortems and reusable fix patterns.
- [CHECKLISTS/FEATURE.md](./CHECKLISTS/FEATURE.md), [SECURITY.md](./CHECKLISTS/SECURITY.md), [SCALE.md](./CHECKLISTS/SCALE.md) — gate every new PR against these.
