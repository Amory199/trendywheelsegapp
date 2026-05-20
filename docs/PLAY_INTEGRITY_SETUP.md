# Disabling the reCAPTCHA fallback for Firebase Phone Auth

## Why this exists

`@react-native-firebase/auth`'s `signInWithPhoneNumber` on Android attempts SafetyNet/Play Integrity attestation first. When that's not configured for the project, it falls back to a reCAPTCHA web challenge — which is what the user sees as the "reCAPTCHA thing" before the OTP arrives.

To remove the reCAPTCHA prompt entirely on Android, register the app's signing certs with Play Integrity in the Firebase Console. **This is operational — code can't do it.**

## Prerequisites

- Firebase project `trendywheels-a7635` (already set up).
- Access to the Firebase Console for that project.
- The release + debug SHA-256 fingerprints of the Android signing keystore. EAS Build uses a managed keystore — get the SHAs from EAS:

```bash
cd apps/mobile
EXPO_TOKEN=<token> pnpm exec eas credentials --platform android
# pick the project → preview profile → "View keystore"
# copy the "SHA256" line
```

## Steps

1. Open Firebase Console → **Project settings** → **Your apps** → Android app (`com.trendywheels.app`) → "SHA certificate fingerprints".
2. Click **Add fingerprint** and paste the SHA-256 from EAS. Save.
3. Repeat for both the release keystore (the one EAS uses for `preview` and `production` profiles) and any local debug keystore if you build outside EAS.
4. Open Firebase Console → **App Check** (left sidebar, under "Build").
5. Find the Android app row, click **Register**. In the provider list pick **Play Integrity**. Accept the defaults.
6. Back in **App Check** → **APIs** tab → set the Authentication API enforcement to **Unenforced** for the first week (so we don't lock real users out if a device fails attestation), then flip to **Enforced** once you've verified normal OTP flow works.

## Verifying

After step 5 is saved (allow 5–10 minutes for propagation), open the app on the test phone and tap "Send code" on the phone-auth screen. The reCAPTCHA web view should NOT appear; the OTP SMS arrives directly.

If reCAPTCHA still shows:

- Confirm the SHA-256 added matches the keystore EAS actually signed the APK with (re-run `eas credentials` and compare).
- Force-stop the app, clear its data, then retry — App Check tokens are cached.
- Check Firebase Console → App Check → **Recent requests** for the Auth API. If you see `INVALID_PLAY_INTEGRITY_TOKEN` entries, the device isn't attesting (typical on rooted/emulator devices — works fine on retail Android).

## Rollback

If something breaks, in Firebase Console → App Check → APIs → Authentication → set enforcement back to **Unenforced**. The reCAPTCHA fallback comes back but normal users can still sign in.

## Side notes

- iOS uses APNs token-based attestation by default; no reCAPTCHA fallback there.
- The Firebase test phones (`+201500001001` / `+201500001002`) bypass all of this since they're configured in the console.
- This setup also unlocks Play Integrity for other Firebase services later (Realtime Database, Functions, etc.) — one config covers them all.
