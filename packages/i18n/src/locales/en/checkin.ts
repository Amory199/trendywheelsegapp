// Staff / admin pickup check-in (QR handover) screen.
const checkin = {
  title: "Check-in",
  searchPlaceholder: "Scan or enter pass code (TW-…)",
  hint: "Find a confirmed booking by its TW code, customer, or vehicle, then confirm the handover.",
  empty: "No bookings waiting for pickup.",
  noMatch: "No booking matches that.",
  guest: "Guest",
  paid: "Paid",
  unpaid: "Unpaid",
  confirmTitle: "Confirm handover",
  customer: "Customer",
  phone: "Phone",
  vehicle: "Vehicle",
  dates: "Dates",
  total: "Total",
  collectLabel: "Payment collected",
  collectSub: "cash — mark this booking as paid",
  confirmCta: "Confirm handover",
  cancel: "Cancel",
  doneTitle: "Handed over",
  doneBody: "Pickup recorded. Enjoy the ride!",
  failTitle: "Couldn't check in",
  pickedUp: "Picked up",
} as const;

export default checkin;
