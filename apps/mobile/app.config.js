// EAS injects file secrets via env vars holding the path to the decrypted file.
// Local builds fall back to the gitignored files at ./apps/mobile/.
const iosGoogleServices = process.env.GOOGLE_SERVICES_INFO_PLIST || "./GoogleService-Info.plist";
const androidGoogleServices = process.env.GOOGLE_SERVICES_JSON || "./google-services.json";

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
      googleServicesFile: iosGoogleServices,
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#FFFFFF",
      },
      package: "com.trendywheels.app",
      googleServicesFile: androidGoogleServices,
      permissions: ["android.permission.USE_BIOMETRIC", "android.permission.USE_FINGERPRINT"],
    },
    plugins: [
      "expo-router",
      "expo-secure-store",
      "expo-local-authentication",
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
    updates: {
      url: "https://u.expo.dev/trendywheels",
    },
    runtimeVersion: {
      policy: "appVersion",
    },
    extra: {
      eas: {
        projectId: "6463af40-c34e-4dd4-840f-1193dccaa575",
      },
    },
    owner: "amro1999",
  },
};
