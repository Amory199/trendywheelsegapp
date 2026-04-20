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
  },
};
