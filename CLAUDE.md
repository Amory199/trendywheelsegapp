# Claude entry point

Read these in order before making changes:

1. **[AGENTS.md](./AGENTS.md)** — rules, conventions, monorepo layout, per-app commands
2. **[INCIDENTS.md](./INCIDENTS.md)** — known problems + their canonical fixes. **Grep here first when diagnosing a bug.**
3. **[graphify-out/GRAPH_REPORT.md](./graphify-out/GRAPH_REPORT.md)** — knowledge-graph snapshot of the monorepo (God Nodes, Surprising Connections, cross-package edges). **Skim before any cross-cutting change.** Query the full graph with `/graphify <question>` inside Claude Code, or `graphify query "<question>"` from the shell. Regenerate code structure offline with `graphify update .` after meaningful refactors.
4. **[CHECKLISTS/](./CHECKLISTS/)** — [FEATURE](./CHECKLISTS/FEATURE.md), [SECURITY](./CHECKLISTS/SECURITY.md), [SCALE](./CHECKLISTS/SCALE.md). **Required gates before opening any PR.** CI enforces completion. See AGENTS.md rules 11–13.
5. **[AUDIT_FINDINGS.md](./AUDIT_FINDINGS.md)** — consolidated audit findings (2026-05-28). Read before triaging anything that sounds like a known issue.
6. **[ARCHITECTURE.md](./ARCHITECTURE.md)** — "where does this go?" decision table for new code
7. **[RUNBOOK.md](./RUNBOOK.md)** — deploy, rollback, on-call, incident response

App-specific notes live in each `apps/*/AGENTS.md` if present.

## Hard rules (also in AGENTS.md, repeated for visibility)

- **Never** add AI attribution (Claude / Anthropic / "Co-Authored-By: Claude") to commits, code, comments, or any tracked file.
- **Always** scan [INCIDENTS.md](./INCIDENTS.md) before fixing a non-trivial bug. If the symptom matches a past INC, reuse that fix pattern.
- **Use the graph for code recall before grep.** Skim [graphify-out/GRAPH_REPORT.md](./graphify-out/GRAPH_REPORT.md) (God Nodes, Surprising Connections) or run `/graphify "<question>"` / `graphify query "<question>"`. The graph spans all five apps + eight packages — much faster than re-grepping the monorepo from scratch, and surfaces cross-package dependencies grep misses.
- **Always** append an INC entry after fixing a non-trivial bug. Threshold: >10 min to diagnose, >2 files touched, or user-visible / Sentry / Play / Firebase error.
- **Always** run `pnpm typecheck` and the touched app's smoke test before committing.
- **Never** `pnpm install` without `--frozen-lockfile` when verifying a dependency change — silent regenerations hide drift (see [INC-002](./INCIDENTS.md)).
