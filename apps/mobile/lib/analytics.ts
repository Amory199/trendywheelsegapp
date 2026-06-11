import analytics from "@react-native-firebase/analytics";

// Firebase Analytics event helper. Fire-and-forget and exception-proof so an
// analytics failure can never affect a user flow. Event names follow GA4
// conventions (snake_case, <40 chars).
//
// Canonical events used across the app:
//   login                { method: "firebase_phone" | "trial_otp" }
//   sign_out
//   booking_created      { vehicle_id, total_egp, days }
//   order_created        { order_id, total_egp, items }
//   repair_requested     { category }
//   listing_submitted    { kind: "sell" | "rent" | "trade_in" }
//   review_submitted     { vehicle_id, rating }
//   favorite_added       { vehicle_id }   / favorite_removed
//   language_changed     { language }
export function logEvent(name: string, params?: Record<string, unknown>): void {
  try {
    void analytics()
      .logEvent(name, params)
      .catch(() => {
        /* native module unavailable (old binary) or network — ignore */
      });
  } catch {
    /* never throw into a user flow */
  }
}

export function setAnalyticsUser(userId: string | null): void {
  try {
    void analytics()
      .setUserId(userId)
      .catch(() => {});
  } catch {
    /* ignore */
  }
}
