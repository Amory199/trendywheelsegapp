// Admin support queue. Renders the shared TicketQueue inside the ADMIN
// navigator — the dashboard's "Open tickets" KPI lands here, so an admin
// never gets dropped into the staff hub's tab bar.
import { TicketQueue } from "../../crm/tickets/index";

export default function AdminTickets(): React.JSX.Element {
  return <TicketQueue detailBase="/admin/tickets" backFallback="/admin/dashboard" />;
}
