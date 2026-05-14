// SDK 53 — Firebase v24 plugins are now supported.
// EAS injects GOOGLE_SERVICES_INFO_PLIST + GOOGLE_SERVICES_JSON file secrets;
// locally, Expo will look for the files alongside this config.

module.exports = {
  expo: {
    name: "TrendyWheels",
    slug: "trendywheels",
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
      supportsTablet: true,
      bundleIdentifier: "com.trendywheels.app",
      googleServicesFile: process.env.GOOGLE_SERVICES_INFO_PLIST ?? "./GoogleService-Info.plist",
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#FFFFFF",
      },
      package: "com.trendywheels.app",
      permissions: ["android.permission.USE_BIOMETRIC", "android.permission.USE_FINGERPRINT"],
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json",
    },
    plugins: [
      "expo-router",
      "expo-secure-store",
      "expo-local-authentication",
      "expo-asset",
      "expo-font",
      [
        "expo-notifications",
        {
          icon: "./assets/notification-icon.png",
          color: "#2B0FF8",
          defaultChannel: "default",
        },
      ],
      "@react-native-firebase/app",
      "@react-native-firebase/crashlytics",
      // Sentry plugin disabled — pnpm strict isolation hides sentry-cli at a
      // path Gradle can't resolve, breaking the source-map upload task. JS
      // Sentry init in lib/sentry.ts still works at runtime; we'll re-enable
      // source-map upload for production builds once we hoist sentry-cli.
      // [
      //   "@sentry/react-native/expo",
      //   {
      //     organization: process.env.SENTRY_ORG ?? "amrco-yk",
      //     project: process.env.SENTRY_PROJECT ?? "react-native",
      //   },
      // ],
      [
        "expo-build-properties",
        {
          ios: { useFrameworks: "static" },
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    // expo-updates fully disabled until we actually publish OTA updates.
    // The url + runtimeVersion are intentionally omitted: with url set,
    // EAS warns about a missing channel on every build even though we
    // never fetch from it. Re-add both (plus channel in eas.json) when
    // OTA goes live.
    extra: {
      eas: {
        projectId: "6463af40-c34e-4dd4-840f-1193dccaa575",
      },
    },
    owner: "amro1999",
  },
};
