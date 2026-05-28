<!--
  Required PR template. The checklist gate (.github/workflows/checklist-gate.yml)
  will fail if the required completion markers below are missing.

  - Every PR: FEATURE checklist must be confirmed.
  - PRs touching auth/secrets/file upload/role enforcement/external integrations:
    also confirm SECURITY checklist.
  - PRs touching DB/queues/cache/websocket/list endpoints: also confirm SCALE checklist.

  See AGENTS.md rules 11–13 and CHECKLISTS/*.md for the full lists.
-->

## What & why

<!-- 1–3 sentences. The "why" matters more than the "what" — diffs already show what changed. -->

## Touches

<!-- Tick all that apply. Used by the CI gate to decide which checklists are required. -->

- [ ] Auth / sessions / role enforcement
- [ ] Secrets / env vars / external integrations
- [ ] File upload / user-supplied content
- [ ] Prisma schema or migration
- [ ] BullMQ workers / queues
- [ ] Cache / Redis
- [ ] Socket.IO / real-time
- [ ] New list endpoint or unbounded query
- [ ] None of the above (small / cosmetic / docs only)

## Checklist confirmation

<!--
  Required line for the gate to pass. Add one or more of:
    CHECKLISTS-COMPLETED: feature
    CHECKLISTS-COMPLETED: security
    CHECKLISTS-COMPLETED: scale

  "feature" is required for every PR. "security" / "scale" are required
  when the boxes above are ticked. If you skipped a checklist because
  it didn't apply, write WHY here in plain English — the reviewer will
  check.
-->

CHECKLISTS-COMPLETED: feature

## Test plan

<!-- Bulleted checklist. What did you actually verify? -->

- [ ] `pnpm typecheck` green on touched apps
- [ ] `pnpm lint` clean
- [ ] Smoke tested locally
- [ ] (UI changes) verified in browser / on device — golden path + 1 edge case

## INCIDENTS check

<!-- Per AGENTS.md rules 8–9: grep INCIDENTS.md before fixing, append after. -->

- [ ] Grepped INCIDENTS.md for the symptom / touched files — no prior INC matches, OR I'm extending the matching INC
- [ ] (If non-trivial bug fix) appended a new INC entry to INCIDENTS.md

## Related

<!-- Related INC numbers, PR numbers, Sentry events, Linear / GitHub issues. -->
