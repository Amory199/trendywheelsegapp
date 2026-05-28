# Scale gate — copy + tick before opening a PR

Target: millions of users in Egypt. Every change that touches a hot path (DB, queue, cache, websocket, list endpoint) goes through this list before merge.

This is the **scalability / performance** gate. FEATURE and SECURITY are separate.

## Database

- [ ] Every `where` / `orderBy` / join column has an explicit `@@index` in `packages/db/prisma/schema.prisma`. Composite indexes for compound filters.
- [ ] No `findMany()` without a `take:` cap. Default pagination limit ≤ 50, hard max ≤ 200.
- [ ] No `.then(rows => Promise.all(rows.map(r => prisma.x.findUnique(...))))` patterns. Use `include` or a single `findMany` with `in:`.
- [ ] Multi-step writes in one `prisma.$transaction([...])`. Never two `await`s that should be atomic.
- [ ] Migration is **additive only** (new columns nullable or with safe defaults). If non-additive, attached a rollback + zero-downtime plan to the PR.
- [ ] Cascading deletes audited — if `onDelete: Cascade`, confirmed that the loss is intentional (financial / audit records → `SetNull` instead).

## Query plan

- [ ] For any new SQL touching > 10k-row tables: ran `EXPLAIN ANALYZE` on staging copy, captured the plan in the PR description.
- [ ] No sequential scan over a hot table in the plan. If unavoidable, justified (full-scan analytics endpoint, etc.) and rate-limited tight.

## Caching

- [ ] If the data is read 10x more than written → Redis cache layer with explicit TTL.
- [ ] Cache invalidation on write — explicit `del()` or version key bump. No "wait for TTL".
- [ ] Cache stampede protected (probabilistic early expiry, lock on miss, or background refresh).

## Queues (BullMQ)

- [ ] New worker → `defaultJobOptions: { attempts: 3+, backoff: { type: "exponential", delay: 2000 } }`.
- [ ] New worker → `concurrency:` set explicitly (don't accept unlimited default).
- [ ] New job type → idempotency: job handler is safe to replay (database upserts, not blind inserts; or use an idempotency key column).
- [ ] Catastrophic failure path → dead-letter queue, not silent drop.

## Real-time (Socket.IO)

- [ ] New event → emitted to a per-user room (`user:${userId}`), never globally.
- [ ] Subscription authorized — server checks `socket.user.id === targetUserId` before joining a room.
- [ ] If we ever scale API beyond one instance: Socket.IO Redis adapter required. New event types document whether they cross instances.

## API surface

- [ ] Response payload bounded. No nested `include` that returns 1k+ rows in one go.
- [ ] Hot read endpoint → `Cache-Control: public, max-age=60` (or similar) for CDN edge caching when payload allows.
- [ ] N+1 detection: any controller mapping over `data` to do a second `findUnique` is a red flag — refactor before merge.

## Mobile / web bundle

- [ ] New screen → no unbounded scroll without virtualization (`FlatList` with `windowSize`, `react-window`, etc.).
- [ ] New dependency added → cost-checked (`pnpm why`, bundle size). If > 100kb, justified.
- [ ] Heavy imports lazy-loaded behind route boundaries (Next.js dynamic, React.lazy, Expo router lazy).

## Observability

- [ ] Slow operations (> 200ms) logged at warn level with `requestId` for correlation.
- [ ] New metric / dashboard added for any new SLO surface (e.g., new payment provider → success-rate dashboard).
- [ ] Error paths captured to Sentry, not swallowed by try/catch.

## Specific recurring traps

- [ ] If touching `apps/api/src/modules/auth/service.ts`'s refresh-token logic — re-read finding #2 in `AUDIT_FINDINGS.md`. The current lookup scans every active token; don't add to it.
- [ ] If touching `BullMQ` workers — re-read finding #18 and #19 in `AUDIT_FINDINGS.md`. Retry policy + concurrency are mandatory.
- [ ] If touching Prisma schema relations — re-read INC-014 (User cascade deletes).

## Before merge

- [ ] Touched endpoints have a load-test or back-of-envelope number in the PR: "this query at p99 takes Xms on Yk rows".
- [ ] If introducing async work: queue depth + processing rate estimated. Idle backlog < 1k under expected peak.
- [ ] PR description copies this checklist with the boxes ticked, **or** asserts `CHECKLISTS-COMPLETED: scale` (the CI gate checks for this line).

---

Why this exists: see `AUDIT_FINDINGS.md` — the patterns flagged in this checklist are exactly what surfaces under load. Catching them at PR time costs 10 minutes; catching them after launch can cost a multi-day rewrite.
