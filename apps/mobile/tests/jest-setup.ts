// Runs before every test file is loaded. Stubs the native modules + global
// browser APIs that React Native / Expo expect to exist at import-time.

import "@testing-library/jest-native/extend-expect";

// Clear all mock counters between tests so per-test mock.calls assertions
// are isolated.
afterEach(() => {
  jest.clearAllMocks();
});

// expo-router
jest.mock("expo-router", () => {
  const push = jest.fn();
  const replace = jest.fn();
  const back = jest.fn();
  return {
    useRouter: () => ({ push, replace, back }),
    useLocalSearchParams: () => ({}),
    Link: ({ children }: { children: React.ReactNode }) => children,
    Stack: { Screen: () => null },
    Tabs: { Screen: () => null },
    __mockRouter: { push, replace, back },
  };
});

// react-native-reanimated — official mock from the lib
jest.mock("react-native-reanimated", () => require("react-native-reanimated/mock"));

// expo-haptics — silent on tests
jest.mock("expo-haptics", () => ({
  notificationAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  NotificationFeedbackType: { Success: "success", Error: "error" },
  ImpactFeedbackStyle: { Light: "light", Medium: "medium", Heavy: "heavy" },
}));

// react-native Linking — RN's index.js does `require('./Libraries/Linking/Linking').default`
// so we MUST expose a `default` export. Without this, `import { Linking } from "react-native"`
// dereferences to `undefined` and source code crashes when calling Linking.openURL.
jest.mock("react-native/Libraries/Linking/Linking", () => ({
  __esModule: true,
  default: {
    openURL: jest.fn(() => Promise.resolve()),
    canOpenURL: jest.fn(() => Promise.resolve(true)),
    addEventListener: jest.fn(),
  },
}));

// react-native Alert — same default-export pattern as Linking
jest.mock("react-native/Libraries/Alert/Alert", () => ({
  __esModule: true,
  default: { alert: jest.fn() },
  alert: jest.fn(),
}));

// expo-image-picker
jest.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: jest.fn(() =>
    Promise.resolve({
      canceled: false,
      assets: [{ uri: "file:///mock.jpg", width: 100, height: 100, type: "image" }],
    }),
  ),
  MediaTypeOptions: { Images: "images" },
  requestMediaLibraryPermissionsAsync: jest.fn(() => Promise.resolve({ status: "granted" })),
}));

// Firebase auth — never hit real Firebase in tests
jest.mock("@react-native-firebase/auth", () => () => ({
  signInWithPhoneNumber: jest.fn(() =>
    Promise.resolve({
      confirm: jest.fn(() => Promise.resolve({ user: { getIdToken: () => "tok" } })),
    }),
  ),
}));

// expo-secure-store
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

// Skia — stub Canvas + common children incl. Group used by confetti/animations
jest.mock("@shopify/react-native-skia", () => ({
  Canvas: ({ children }: any) => children,
  Group: ({ children }: any) => children,
  Circle: () => null,
  Rect: () => null,
  Path: () => null,
  Fill: () => null,
  vec: () => ({ x: 0, y: 0 }),
}));

// Confetti component depends on Skia internals; stub it entirely
jest.mock("../components/skia/confetti", () => ({
  TWSkiaConfetti: () => null,
}));
