/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: ["./base.js"],
  plugins: ["react-native"],
  settings: {
    "react-native/style-sheet-object-names": ["StyleSheet"],
  },
  rules: {
    "react-native/no-unused-styles": "warn",
    "react-native/no-inline-styles": "warn",
    // Native-module guard. These ship NATIVE code that is NOT in the published
    // binary — importing one and releasing it over-the-air (eas update) makes
    // every device on the old build crash on load, BEFORE Sentry initializes,
    // so the crash is invisible. Adding any of these REQUIRES a fresh native
    // build (eas build) AND an app.config.js `version` bump so the OTA targets
    // the new runtimeVersion. To intentionally add one, do it in a native-build
    // PR and remove it from this list (don't sprinkle eslint-disable).
    "no-restricted-imports": [
      "error",
      {
        paths: [
          "react-native-maps",
          "expo-location",
          "expo-task-manager",
          "expo-background-fetch",
          "react-native-geolocation-service",
          "@react-native-community/geolocation",
        ].map((name) => ({
          name,
          message:
            `${name} is a NATIVE module — it cannot ship via OTA. Add it in a native build ` +
            `(eas build) with an app.config.js version bump, then remove it from no-restricted-imports.`,
        })),
      },
    ],
  },
};
