# Security gate — copy + tick before opening a PR

Run through this list **per change**, not per sprint. A "small" change that touches authentication, file upload, role checks, secret env vars, or external integrations is _never_ small.

This is the **security** gate. FEATURE and SCALE are separate.

## Authentication & authorization

- [ ] Every new endpoint sits behind `authenticate` (or has a written justification for being public — health/auth endpoints only).
- [ ] Role enforcement at **both** route and controller. Defense-in-depth — never rely on the route middleware alone.
- [ ] IDOR: every `req.params.id` that loads a Prisma row is scoped by `req.user.id` (or `req.user.accountType in [...]`). No exceptions for "admin endpoints" — IDORs there are worse.
- [ ] No bypass paths added (debug headers, dev-only secrets, hardcoded test phones). If added for development, gated by `env.NODE_ENV === "development"` + a startup guard refusing to run in production.
- [ ] OTP / token / password compares use constant-time helpers (`bcrypt.compare`, `crypto.timingSafeEqual`). Never `===` on secrets.

## Input validation

- [ ] Zod schema on every `req.body` / `req.params` / `req.query`. **No** controller reads `req.body` directly.
- [ ] No mass assignment — `data: { explicit, fields, only }`, never `data: { ...req.body }`.
- [ ] File uploads: MIME-type whitelist + size cap + magic-byte sanity check + decompression bomb guard.
- [ ] URLs / paths from user input go through allowlist or signed-URL validation — never concatenated into filesystem or S3 paths.
- [ ] Open-redirect guard on every `?next=` / `?redirect=` query param.

## Output / rendering

- [ ] No `dangerouslySetInnerHTML` with anything sourced from API responses.
- [ ] No `innerHTML` / `eval` / `Function()` constructed from user data.
- [ ] CSP headers in `next.config.js` for any new web app or new external origin (image, font, script, connect).

## Tokens & secrets

- [ ] No new tokens, passwords, or keys in source. All secrets come from env vars.
- [ ] New env vars added to `.env.example` with a comment explaining what it is and where to get it.
- [ ] Sensitive fields explicitly added to Pino redaction list (`apps/api/src/utils/logger.ts`) and Sentry beforeSend filter (`apps/api/src/utils/sentry.ts`).
- [ ] Access / refresh tokens stored only via SecureStore (mobile) or httpOnly cookie (web). Never `localStorage`, never plaintext.

## Rate limiting & abuse

- [ ] New endpoint that takes user input → rate-limited. Auth endpoints → tight (≤ 30/15min). Public reads → looser but present.
- [ ] Rate limit keyed on the right axis: per-IP for anonymous, per-user-id for authenticated, per-target-resource (phone, email) for OTP-style flows.
- [ ] Request size limited (`express.json({ limit })`, multipart cap). Default 10mb may be too loose for endpoint X — set explicitly.

## External services

- [ ] New external API call → timeout set, retry policy chosen, idempotent on replay, failure logged with context.
- [ ] Webhooks from external services → signature verified before processing.
- [ ] Outgoing requests pinned to expected hostnames — never to user-supplied URLs without an allowlist (SSRF prevention).

## Specific recurring traps

- [ ] If touching `auth/service.ts` or any phone/OTP flow — re-read INC-001 and the trial-OTP bypass section in `auth/service.ts`. Do not add hardcoded phones.
- [ ] If touching `eas.json`, `app.config.js`, `credentials.json`, or anything in `apps/mobile/credentials/` — re-read INC-001 and INC-008. Never regenerate the keystore.
- [ ] If touching Firebase config — re-read the INC-001 "Play App Signing key" update. SHA-256 of _both_ upload and Play App Signing keys belong in Firebase Console.

## Before merge

- [ ] No new findings in `pnpm audit --audit-level=high`.
- [ ] If the change touches auth, secrets, or external integrations: ran `/security-review` against the diff and triaged findings.
- [ ] PR description copies this checklist with the boxes ticked, **or** asserts `CHECKLISTS-COMPLETED: security` (the CI gate checks for this line).

---

Why this exists: many of the items above map to real incidents — trial OTP bypass (gated only because the env flag defaults to false), keystore swap (INC-001), Firebase fingerprint gap (INC-001 2026-05-26 update), credentials.json near-leak (caught at .gitignore). Ticking these would have caught each one before deploy.
