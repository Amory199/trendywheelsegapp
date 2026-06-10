// Staff ticket detail. Re-exports the support ticket workspace verbatim so a
// staff member working the hub's Support tab gets the full toolkit (status,
// priority, assign, reply) without leaving the staff route group — the screen
// is self-contained and does no cross-route navigation, so one source of truth
// serves both /support and /crm.
export { default } from "../../support/tickets/[id]";
