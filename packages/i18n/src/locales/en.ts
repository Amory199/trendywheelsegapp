import admin from "./en/admin";
import buy from "./en/buy";
import components from "./en/components";
import crm from "./en/crm";
import home from "./en/home";
import messages from "./en/messages";
import profile from "./en/profile";
import rent from "./en/rent";
import sale from "./en/sale";
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
    errorBody: "Please check your connection and try again.",
    nothingHere: "Nothing here yet",
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
    haveSupportCode: "Didn't get a code? Enter a support code",
    supportCodeHint: "Enter the code our support team gave you",
    loginTitle: "Welcome back",
    loginSubtitle: "Log in with your phone number and password.",
    emailLabel: "Email",
    emailPlaceholder: "you@example.com",
    identifierLabel: "Username, phone, or email",
    identifierPlaceholder: "Username or phone number",
    passwordLabel: "Password",
    passwordPlaceholder: "Your password",
    loginCta: "Log in",
    loggingIn: "Logging in…",
    loginFailed: "Login failed",
    invalidCredentials: "Wrong email or password.",
    noAccount: "No account found with that phone number or email.",
    noPasswordSet:
      "This account has no password yet. Sign in with your phone, or ask an admin to set one.",
    wrongPassword: "Incorrect password. Please try again.",
    accountInactive: "This account isn't active. Please contact an admin.",
    noAccountSignup: "New here? Sign up with your phone",
  },
  roleSwitch: {
    viewAs: "View as another role",
    subtitle:
      "Preview the app as a customer or a staff member, with that role's real permissions. Only an admin can do this.",
    actingAs: "Viewing as",
    exit: "Exit",
    customer: "Customer",
    staff: "Staff",
    sales: "Sales",
    support: "Support",
    inventory: "Inventory",
    mechanic: "Mechanic",
    cancel: "Cancel",
    failed: "Couldn't switch role",
  },
  verifyId: {
    title: "Verify your ID",
    heading: "Confirm your identity",
    subtitle:
      "For your security and ours, we need a photo of the front and back of your national ID before this transaction. You only do this once.",
    frontLabel: "ID — front",
    backLabel: "ID — back",
    tapToUpload: "Tap to upload",
    privacy: "Your ID is stored securely and only used to verify rentals, purchases and listings.",
    saveContinue: "Save & continue",
    saveErrorTitle: "Couldn't save your ID",
  },
  dropoff: {
    label: "Delivery drop-off location",
    placeholder: "Paste your Google Maps link",
    openMaps: "Maps",
    helper:
      "Paste a Google Maps link so we know where to deliver — or leave blank to collect from our store.",
    invalidHint:
      "That doesn't look like a Google Maps link. Tap Maps to grab your location, then paste it here.",
  },
  fulfillment: {
    heading: "How would you like to receive it?",
    sellHeading: "How would you like to hand it over?",
    deliverNow: "Deliver to me now",
    deliverNowSub: "We'll arrange delivery to your location right away",
    deliverScheduled: "Deliver to my location",
    deliverScheduledSub: "Pick a spot and we'll schedule the delivery",
    showroomVisit: "Book a showroom visit",
    showroomVisitSub: "See it in person at our showroom first",
    pickupFromMe: "Pick up from me",
    pickupFromMeSub: "Our team collects the vehicle from your location",
    dropoffShowroom: "I'll bring it to the showroom",
    dropoffShowroomSub: "Drop the vehicle at our showroom",
    chooseOne: "Please choose an option to continue.",
    locationRequired: "Add your location link so we know where to come.",
    locationHeading: "Your location",
    confirm: "Confirm",
    submitting: "Submitting…",
    locationLabel: "Drop-off location",
    openInMaps: "Open in Maps",
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
  sale,
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
