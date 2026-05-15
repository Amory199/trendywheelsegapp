// Firebase config temporarily stripped: new EAS account doesn't have
// GOOGLE_SERVICES_JSON / GOOGLE_SERVICES_INFO_PLIST file env vars yet, and
// no JS code imports @react-native-firebase/* so dropping plugins + the
// googleServicesFile entries unblocks the build. Re-add when Firebase
// Console + EAS file secrets are wired on the new account.

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
      supportsTablet: true,
      bundleIdentifier: "com.trendywheels.app",
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#FFFFFF",
      },
      package: "com.trendywheels.app",
      permissions: ["android.permission.USE_BIOMETRIC", "android.permission.USE_FINGERPRINT"],
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
        projectId: "5ec5cee4-e343-4990-be07-71f550d4d86d",
      },
    },
  },
};
