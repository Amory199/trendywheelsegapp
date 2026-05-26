# Claude entry point

Read these in order before making changes:

1. **[AGENTS.md](./AGENTS.md)** — rules, conventions, monorepo layout, per-app commands
2. **[INCIDENTS.md](./INCIDENTS.md)** — known problems + their canonical fixes. **Grep here first when diagnosing a bug.**
3. **[ARCHITECTURE.md](./ARCHITECTURE.md)** — "where does this go?" decision table for new code
4. **[RUNBOOK.md](./RUNBOOK.md)** — deploy, rollback, on-call, incident response

App-specific notes live in each `apps/*/AGENTS.md` if present.

## Hard rules (also in AGENTS.md, repeated for visibility)

- **Never** add AI attribution (Claude / Anthropic / "Co-Authored-By: Claude") to commits, code, comments, or any tracked file.
- **Always** scan [INCIDENTS.md](./INCIDENTS.md) before fixing a non-trivial bug. If the symptom matches a past INC, reuse that fix pattern.
- **Always** append an INC entry after fixing a non-trivial bug. Threshold: >10 min to diagnose, >2 files touched, or user-visible / Sentry / Play / Firebase error.
- **Always** run `pnpm typecheck` and the touched app's smoke test before committing.
- **Never** `pnpm install` without `--frozen-lockfile` when verifying a dependency change — silent regenerations hide drift (see [INC-002](./INCIDENTS.md)).
