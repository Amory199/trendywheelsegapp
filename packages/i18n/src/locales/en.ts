import admin from "./en/admin";
import buy from "./en/buy";
import components from "./en/components";
import crm from "./en/crm";
import home from "./en/home";
import messages from "./en/messages";
import profile from "./en/profile";
import rent from "./en/rent";
import sell from "./en/sell";
import service from "./en/service";
import support from "./en/support";

// Core namespaces (consumed by already-wired screens) stay inline; every other
// screen area lives in its own ./en/<area>.ts module so the dictionary can grow
// per-area without merge conflicts during parallel translation work. Each
// matching ./ar/<area>.ts is type-checked against its en counterpart, so a
// missing Arabic key fails the build.
const en = {
  common: {
    loading: "Loading...",
    error: "Something went wrong",
    retry: "Retry",
    cancel: "Cancel",
    confirm: "Confirm",
    save: "Save",
    delete: "Delete",
    edit: "Edit",
    back: "Back",
    next: "Next",
    search: "Search",
    filter: "Filter",
    sort: "Sort",
    noResults: "No results found",
    viewAll: "View All",
    tryAgain: "Try again",
  },
  auth: {
    enterPhone: "Enter your phone number",
    sendOtp: "Send OTP",
    enterOtp: "Enter the verification code",
    verifyOtp: "Verify",
    otpSent: "Verification code sent to your WhatsApp",
    invalidOtp: "Invalid verification code",
    logout: "Log Out",
    welcome: "Welcome to TrendyWheels",
    phoneSubtitle: "Enter your phone number to get started",
    privacyAgreePrefix: "I agree to the",
    privacyPolicy: "Privacy Policy",
    privacyAgreeSuffix: "and consent to processing my personal data.",
    sending: "Sending…",
    requiredTitle: "Required",
    privacyRequired: "Please accept the Privacy Policy to continue.",
    invalidNumberTitle: "Invalid number",
    invalidNumberMessage: "Enter a 10-digit Egyptian mobile starting with 1.",
    otpSendFailed: "Could not send OTP",
    verifyTitle: "Verify Your Number",
    otpSentTo: "Enter the code sent to",
    verifying: "Verifying…",
    verificationFailed: "Verification failed",
    guestTitle: "Sign in to continue",
    guestBody: "Sign in to use this. You can keep browsing without an account.",
    guestCta: "Sign in",
    browseAsGuest: "Continue browsing without an account",
    keepBrowsing: "Not now — keep browsing",
    haveAccountLogin: "Already have an account? Log in",
    loginTitle: "Welcome back",
    loginSubtitle: "Log in with your email and password.",
    emailLabel: "Email",
    emailPlaceholder: "you@example.com",
    passwordLabel: "Password",
    passwordPlaceholder: "Your password",
    loginCta: "Log in",
    loggingIn: "Logging in…",
    loginFailed: "Login failed",
    invalidCredentials: "Wrong email or password.",
    noAccountSignup: "New here? Sign up with your phone",
  },
  tabs: {
    home: "Home",
    buy: "Buy",
    rent: "Rent",
    sell: "Sell",
    repair: "Service",
    profile: "Profile",
  },
  settings: {
    languageChanged: "Language Changed",
    restartToApply: "Please restart the app to apply the new language and layout.",
  },
  home,
  buy,
  rent,
  sell,
  service,
  profile,
  messages,
  admin,
  crm,
  support,
  components,
} as const;

export default en;

type DeepStringify<T> = {
  [K in keyof T]: T[K] extends object ? DeepStringify<T[K]> : string;
};

export type TranslationKeys = DeepStringify<typeof en>;
