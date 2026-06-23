// Human-readable labels for the guided-checkout fulfillment choice stored on
// reservations / orders / bookings / sell listings / trade-ins.
const LABELS: Record<string, string> = {
  delivery_now: "🚚 Deliver now",
  delivery_scheduled: "📍 Deliver to location",
  showroom_visit: "🏬 Showroom visit",
  pickup_from_me: "📍 Pick up from seller",
  dropoff_showroom: "🏬 Seller drops at showroom",
};

export function fulfillmentLabel(type: string | null | undefined): string | null {
  if (!type) return null;
  return LABELS[type] ?? type;
}
