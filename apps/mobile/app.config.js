module.exports = {
  expo: {
    name: "TrendyWheels",
    slug: "trendy",
    version: "1.0.1",
    orientation: "portrait",
    icon: "./assets/icon.png",
    scheme: "trendywheels",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#FFFFFF",
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: false,
      bundleIdentifier: "com.trendywheels.app",
      // Universal Links: taps on https://app.trendywheelseg.com/{rent,sale,buy}/…
      // open the listing IN the app when installed (expo-router maps the routes),
      // and fall through to the web listing → App Store otherwise. Requires the
      // owner to serve /.well-known/apple-app-site-association on that host
      // (appID P8RUCTV7DY.com.trendywheels.app).
      associatedDomains: ["applinks:app.trendywheelseg.com"],
      // On EAS, GOOGLE_SERVICES_PLIST is injected via file secret. Locally
      // it falls back to the gitignored plist next to this config.
      googleServicesFile: process.env.GOOGLE_SERVICES_PLIST ?? "./GoogleService-Info.plist",
      infoPlist: {
        // HTTPS-only; no proprietary encryption. Apple's "exempt" category.
        ITSAppUsesNonExemptEncryption: false,
        NSPhotoLibraryUsageDescription:
          "TrendyWheels uses your photo library so you can upload pictures of vehicles for trade-in, repair requests, and your profile.",
        // Required for Firebase Phone Auth silent-push device verification.
        // Without this, iOS drops Firebase's silent verification push and the
        // SDK falls back to a reCAPTCHA webview (which then network-errors
        // on some carriers). APNs key upload to Firebase is necessary but
        // not sufficient — the app must be allowed to receive remote pushes
        // in the background or the silent verification message never arrives.
        UIBackgroundModes: ["remote-notification"],
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#FFFFFF",
      },
      package: "com.trendywheels.app",
      // On EAS, GOOGLE_SERVICES_JSON is injected via file secret. Locally
      // it falls back to the gitignored JSON next to this config.
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json",
      permissions: ["android.permission.USE_BIOMETRIC", "android.permission.USE_FINGERPRINT"],
      // App Links: verified https deep links into the listing screens. autoVerify
      // makes Android check /.well-known/assetlinks.json on the host (owner must
      // serve it with the app's release SHA-256) so links open the app directly
      // with no chooser. Unverified, they still work but may show a chooser.
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            { scheme: "https", host: "app.trendywheelseg.com", pathPrefix: "/rent" },
            { scheme: "https", host: "app.trendywheelseg.com", pathPrefix: "/sale" },
            { scheme: "https", host: "app.trendywheelseg.com", pathPrefix: "/buy" },
          ],
          category: ["BROWSABLE", "DEFAULT"],
        },
      ],
    },
    plugins: [
      "expo-router",
      "expo-secure-store",
      "expo-local-authentication",
      "expo-asset",
      "expo-audio",
      "expo-font",
      "@react-native-firebase/app",
      "@react-native-firebase/auth",
      "@react-native-community/datetimepicker",
      "@sentry/react-native",
      "expo-video",
      [
        "expo-notifications",
        {
          icon: "./assets/notification-icon.png",
          color: "#2B0FF8",
          defaultChannel: "default",
        },
      ],
      [
        "expo-build-properties",
        {
          ios: { useFrameworks: "static", deploymentTarget: "17.0" },
          // Android 15+ requires 16 KB page-size alignment. NDK r27+ + SDK 35
          // produces 16KB-aligned native libs.
          android: {
            compileSdkVersion: 36,
            targetSdkVersion: 36,
            minSdkVersion: 24,
            ndkVersion: "27.1.12297006",
          },
        },
      ],
      "./plugins/with-fmt-cpp17",
      "./plugins/with-rnfb-modular-headers",
      // Strips expo-audio's unused media-playback/mic foreground service +
      // permissions from the merged manifest (we only play short UI sounds).
      // Clears the Play "Foreground service permissions" policy block.
      "./plugins/with-strip-audio-foreground-service",
    ],
    experiments: {
      typedRoutes: true,
    },
    runtimeVersion: { policy: "appVersion" },
    updates: {
      url: "https://u.expo.dev/641975a5-54c8-49e4-aa3b-2519c084d0e1",
      enabled: true,
      checkAutomatically: "ON_LOAD",
      fallbackToCacheTimeout: 0,
    },
    owner: "amrco19s-organization",
    extra: {
      eas: {
        // Project transferred amrco_19 -> amrco19s-organization on 2026-06-16
        // for fresh iOS build quota (amrco_19 hit its monthly free cap).
        // Same projectId — OTA continuity + project env vars preserved;
        // signing creds are local files so they carry over untouched.
        projectId: "641975a5-54c8-49e4-aa3b-2519c084d0e1",
      },
    },
  },
};
