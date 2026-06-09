# Post-Launch Roadmap

90-day plan locked 2026-06-09 by multi-agent council (3 ideators + adversarial critic + synthesizer).

## Principles

- Trim aggressively. No engines, rules editors, or config consoles. Hardcode thresholds; tables over charts.
- Sequence by what unblocks revenue. Sales push first — hot leads decay in hours.
- Build shared models once, surface multiple views. Cash events feed COD checklist (sales) + reconciliation ledger (admin). Commission model feeds ledger (sales) + payout report (admin).
- Dashboards last. Built earlier they're full of holes.
- Cap each bucket at 4-5 features. Solo dev can't ship more in 4-5 weeks alongside support.

## v1.1 — Stop the bleeding (≈4 weeks)

| #   | Feature                                                                  | Role          | Days |
| --- | ------------------------------------------------------------------------ | ------------- | ---- |
| 1   | Sales mobile push for new leads                                          | sales         | 2    |
| 2   | WhatsApp deep-link from lead card                                        | sales         | 1    |
| 3   | Quick inventory toggle on mobile (SOLD/RESERVED/AVAILABLE)               | sales         | 3    |
| 4   | Buyer pipeline Phase 1: viewing requests                                 | customer      | 5    |
| 5   | Cash reconciliation + COD collection checklist (shared cash-event model) | sales + admin | 6    |

Bucket: ~17 dev-days.

## v1.2 — Tighten funnel + pay the team (≈5 weeks)

| #   | Feature                                                   | Role          | Days |
| --- | --------------------------------------------------------- | ------------- | ---- |
| 1   | Buyer pipeline Phase 2: deposit → paperwork → delivery    | customer      | 5    |
| 2   | Fawry / Vodafone Cash deposits                            | customer      | 10   |
| 3   | Stale lead nudges (single 48h push) + Agent handoff       | sales         | 3    |
| 4   | Repair ETA WhatsApp auto-notify (no customer push)        | sales         | 2    |
| 5   | Commission ledger + payout report (shared model, 2 views) | sales + admin | 5    |

Bucket: ~25 dev-days.

## v1.3 — Owner gets eyes + growth (≈5 weeks)

| #   | Feature                                               | Role     | Days |
| --- | ----------------------------------------------------- | -------- | ---- |
| 1   | Today dashboard                                       | admin    | 4    |
| 2   | Agent performance leaderboard                         | admin    | 3    |
| 3   | Customer lifetime view                                | admin    | 4    |
| 4   | Anomaly alerts (3 hardcoded thresholds, nightly cron) | admin    | 2    |
| 5   | Referral loyalty with WhatsApp share                  | customer | 7    |

Bucket: ~20 dev-days.

## Deferred past v1.3 (return when evidence appears)

- **Live order tracking** (12d) — revisit after Fawry payments unlock online deals
- **Saved searches + new inventory alerts** (5d) — wait until inventory > ~100 cars
- **My Garage history view** (3d trimmed) — slot mid-cycle if requested
- **Mechanic diagnosis photos** (6d) — depends on live tracking infra
- **Fleet utilization aging table** (2d trimmed) — first v1.4 candidate
- **WhatsApp broadcast analytics** (4d trimmed) — wait until first campaign needs measuring
- **Repair throughput dashboard** — defer; v1.2 ETA notify covers current pain
- **Audit trail search** — slot when first real dispute lands
- **Daily target dashboard** (sales-side) — bumped; targets not yet defined
- **Inventory low-stock alert by category** (1d trimmed) — global threshold works, per-category is config-console territory

## Killed by critic (return only on hard evidence)

- ❌ Trade-in quick-quote helper — pricing-model rabbit hole, no high-frequency evidence
- ❌ Lead routing rules editor — premature abstraction, owner has named zero rules
- ❌ Business config console — owner IS the engineer, env vars suffice until 5+ non-eng-tunable knobs
- ❌ Sales-side response/close metrics — duplicated by admin leaderboard

## Cross-cutting models to build once

**cash_event** (v1.1, used by both COD checklist and admin reconciliation ledger):

- id, dealId, type (collected/refunded/adjusted), amountEgp, receiptPhotoUrl, collectedBy (userId), collectedAt
- Used in v1.2 for commission calculation (commission = % of cash_event.amountEgp on closed deals)

**lead_event** (v1.1 sales push feature, used downstream by stale nudges + handoff + leaderboard):

- id, leadId, type (assigned/responded/whatsapp_sent/stale_warned/handed_off), actorUserId, payload (jsonb), createdAt
- v1.3 leaderboard reads response-time as median(first_responded.createdAt - assigned.createdAt) per agent

**vehicle_status_change** (v1.1 inventory toggle):

- id, vehicleId, fromStatus, toStatus, actorUserId, dealId (nullable, links to closing deal), changedAt
- Source of truth for "who closed which car" — feeds commission model in v1.2
