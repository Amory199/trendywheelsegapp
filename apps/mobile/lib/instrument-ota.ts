import * as Updates from "expo-updates";

import { logEvent } from "./analytics";
import { reportClientError } from "./error-reporter";

// OTA delivery instrumentation. Publishing an `eas update` does NOT prove it
// reached a device — a runtimeVersion mismatch or a failed download leaves
// users silently on a stale bundle (the INC-030/031/032 history). This reports,
// on every boot, exactly which update each device is actually running, plus the
// outcome of a fresh update check — so "published" can be confirmed as
// "delivered" from analytics instead of assumed. Fire-and-forget; never throws.
export function initOtaTelemetry(): void {
  try {
    // What is THIS device running right now?
    logEvent("ota_running", {
      update_id: Updates.updateId ?? "embedded",
      channel: Updates.channel ?? "unknown",
      runtime_version: Updates.runtimeVersion ?? "unknown",
      // true = booted the bundle baked into the binary (no OTA applied yet)
      is_embedded: Updates.isEmbeddedLaunch ?? false,
      created_at: Updates.createdAt ? Updates.createdAt.toISOString() : null,
    });

    // expo-updates is disabled in dev clients — checking there just throws.
    if (__DEV__ || !Updates.isEnabled) return;

    void Updates.checkForUpdateAsync()
      .then((result) => {
        logEvent("ota_check", {
          available: result.isAvailable,
          // When available, ON_LOAD has already started fetching; this records
          // that a newer bundle exists so we can watch adoption roll out.
          manifest_id:
            result.isAvailable && "id" in result.manifest ? String(result.manifest.id) : null,
        });
      })
      .catch((err) => {
        // A failing update check is itself a delivery signal worth seeing.
        reportClientError({
          level: "warn",
          message: `ota check failed: ${err instanceof Error ? err.message : String(err)}`,
          metadata: { channel: Updates.channel ?? "unknown" },
        });
      });
  } catch {
    /* telemetry must never break boot */
  }
}
