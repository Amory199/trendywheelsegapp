module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/tests/jest-setup.ts"],
  testPathIgnorePatterns: ["/node_modules/", "/.expo/", "/dist/"],
  transformIgnorePatterns: [
    // pnpm-aware: anything inside node_modules whose path contains a React
    // Native / Expo / Firebase / Skia / Navigation package gets transformed.
    "node_modules/(?!.*(react-native|@react-native|@react-navigation|expo|@expo|@shopify/react-native-skia|@react-native-firebase))",
  ],
  moduleNameMapper: {
    "\\.(jpg|jpeg|png|gif|svg)$": "<rootDir>/tests/__mocks__/fileMock.ts",
    "^\\.\\./\\.\\./lib/sounds$": "<rootDir>/tests/__mocks__/sounds.ts",
    "^\\.\\./lib/sounds$": "<rootDir>/tests/__mocks__/sounds.ts",
  },
};
