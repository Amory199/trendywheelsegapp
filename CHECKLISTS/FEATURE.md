# Feature gate — copy + tick before opening a PR

Every new endpoint, screen, or capability passes through this list. If a box doesn't apply, write `n/a — <why>` next to it. Don't silently drop items.

This is the **product / correctness** gate. SECURITY and SCALE are separate.

## Contract

- [ ] Types live in `packages/types/src/index.ts`, not redefined per-app.
- [ ] API contract documented in `apps/api/src/openapi.ts` (request + response schema).
- [ ] Zod validator in `packages/validators/src/index.ts` for every `req.body` / `req.params` / `req.query`.
- [ ] Shared client method in `packages/api-client/src/index.ts` — no raw `fetch(...)` in app code.
- [ ] Response shapes round-trip through `parse:` (no `as unknown as <T>` casts) — see INC-011.

## UX

- [ ] Loading state on every async action (button spinner / skeleton).
- [ ] Error state on every async action (toast / inline message — never silent).
- [ ] Empty state for every list view.
- [ ] Idempotent submit: button disables during `isPending`; for mutations that can replay, also send an idempotency key.
- [ ] i18n: every user-facing string lives in `packages/i18n/src/` (en + ar). No inline English in JSX.
- [ ] RTL respected — Arabic users land on a mirrored layout, not a broken one.

## Data

- [ ] No `data: req.body` mass-assignment in controllers. Use explicit field picks.
- [ ] Every Prisma `where` / `orderBy` / join column has an `@@index` (or a compelling reason it doesn't).
- [ ] Multi-step writes wrapped in `prisma.$transaction([...])`.
- [ ] Pagination on every list endpoint — no unbounded `findMany()`.
- [ ] Soft-delete or hard-delete chosen deliberately and matches the data class (financial records → soft, ephemeral → hard).

## Tests

- [ ] Unit / integration tests for new service-layer logic.
- [ ] At least one smoke-test step exercising the new endpoint via `apps/api/scripts/smoke-test.sh`.
- [ ] If a UI change: verified manually in the browser / on a device, golden path + at least one edge case.
- [ ] If a migration: ran on a staging copy of the DB; rollback path documented in the PR.

## Docs

- [ ] AGENTS.md / app-level AGENTS.md still accurate after the change.
- [ ] INCIDENTS.md scanned — if the symptom you fixed matches an existing INC, update that entry (don't fork).
- [ ] If the change introduces a new external dependency (service, package, env var) — entry in `.env.example` + a one-paragraph note in RUNBOOK.md.
- [ ] Knowledge graph still accurate enough — if the change is structural (new package, big rename, new module), run `graphify update .` and commit the refreshed `graphify-out/GRAPH_REPORT.md`.

## Before merge

- [ ] `pnpm typecheck` green on touched apps.
- [ ] `pnpm lint` clean (no warnings introduced).
- [ ] `pnpm test` green (or explicitly justified skip).
- [ ] Smoke test passes against a staging deploy.
- [ ] PR description copies this checklist with the boxes ticked, **or** asserts `CHECKLISTS-COMPLETED: feature` (the CI gate checks for this line).

---

Why this exists: see `INCIDENTS.md` for what happens when this gate is skipped. INC-002 (lockfile drift), INC-003 (React 19 namespace breakage), and INC-006 (rent page enums) would have been caught by ticking the boxes above.
