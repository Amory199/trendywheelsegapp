module.exports = {
  expo: {
    name: "TrendyWheels",
    slug: "trendy",
    version: "1.0.0",
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
    owner: "amrco_19",
    extra: {
      eas: {
        // Re-init'd against amrco_19 on 2026-05-20 after asasasasas hit its
        // monthly free build cap. New keystore — old APK can't be upgraded;
        // must be uninstalled before installing this build.
        projectId: "641975a5-54c8-49e4-aa3b-2519c084d0e1",
      },
    },
  },
};
