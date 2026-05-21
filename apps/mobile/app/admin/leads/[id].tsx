// Thin wrapper that re-exports the CRM lead detail screen but lives under
// /admin/leads/[id] so the admin Tabs scope (and its tab bar) is preserved.
// Previously, navigating from /admin/leads/inactive to /crm/leads/:id dropped
// the admin into the sales/CRM layout and they couldn't get back without
// signing out.
export { default } from "../../crm/leads/[id]";
