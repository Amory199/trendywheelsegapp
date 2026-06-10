import appCheck from "@react-native-firebase/app-check";

// Firebase App Check — DeviceCheck (iOS) / Play Integrity (Android).
//
// Firebase's anti-abuse rules now require an App Check token for Phone Auth on
// production apps. Without one, the iOS SDK tries to verify the app via a
// silent APNs push and, when that isn't available, falls back to a reCAPTCHA
// web flow. This project has no reCAPTCHA URL scheme, so that fallback dies
// with "reCAPTCHA dependencies are not met" — which blocks the OTP send for
// EVERY number, including Firebase test numbers (the client attests the app
// before the server ever sees the number). DeviceCheck lets iOS attest the app
// directly, so the OTP send goes through and the SMS is delivered normally.
//
// Wrapped so it can never block boot or the sign-in screen, and OTA-safe: the
// calls no-op if the native module isn't present in an older binary.

let started = false;

export async function initAppCheck(): Promise<void> {
  if (started) return;
  started = true;
  try {
    const provider = appCheck().newReactNativeFirebaseAppCheckProvider();
    provider.configure({
      apple: { provider: "deviceCheck" },
      android: { provider: "playIntegrity" },
    });
    await appCheck().initializeAppCheck({
      provider,
      isTokenAutoRefreshEnabled: true,
    });
  } catch {
    // Best-effort: never let attestation startup break sign-in. If it can't
    // initialize, phone auth simply falls back to the legacy path.
  }
}
