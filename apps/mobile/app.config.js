// Firebase config files are referenced once we re-add @react-native-firebase
// plugins (after Expo SDK 53 upgrade). For now they're not used.

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
      [
        "expo-notifications",
        {
          icon: "./assets/notification-icon.png",
          color: "#2B0FF8",
          defaultChannel: "default",
        },
      ],
      // Firebase config plugins are temporarily dropped — installed @react-native-firebase
      // v24 needs Expo SDK 53; this app is on SDK 51. Re-enable after the SDK upgrade.
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
