export default {
  onboarding: {
    title: "Complete your profile",
    subtitle: "Almost there. We just need a couple of details to set up your account.",
    nameLabel: "Full name *",
    namePlaceholder: "e.g. Mohamed Ghazaly",
    ageLabel: "Age *",
    agePlaceholder: "e.g. 28",
    emailLabel: "Email (optional)",
    emailPlaceholder: "you@example.com",
    passwordLabel: "Password *",
    passwordPlaceholder: "At least 8 characters",
    confirmLabel: "Confirm password *",
    confirmPlaceholder: "Re-enter password",
    credentialsHint:
      "Set a password so next time you can log in with your phone number — no code needed.",
    passwordMismatch: "Passwords don't match",
    saveError: "Failed to save profile",
    getStarted: "Get started",
  },
  notFound: {
    title: "Page Not Found",
    goHome: "Go Home",
  },
  offline: {
    banner: "No connection — retrying…",
  },
  updateGate: {
    title: "Update required",
    body: "This version of TrendyWheels is no longer supported. Please update to keep booking, buying, and managing your carts.",
    updateNow: "Update now",
  },
  review: {
    alreadyReviewedTitle: "Already reviewed",
    alreadyReviewedMessage: "You've already rated this rental.",
    genericError: "Something went wrong. Please try again.",
    successTitle: "Thanks for your review!",
    successHint: "It helps other riders pick the right wheels.",
    done: "Done",
    heading: "Rate your rental",
    titlePlaceholder: "Title (optional)",
    bodyPlaceholder: "How was your ride? (optional)",
    submit: "Submit review",
    notNow: "Not now",
  },
  privacy: {
    back: "← Back",
    title: "Privacy Policy",
    lastUpdated: "Last updated: April 2026",
    section1Title: "1. Information We Collect",
    section1Body:
      "We collect your phone number for authentication, and optionally your name, email address, and profile photo. When you use our services we also collect booking history, vehicle interactions, and support communications.",
    section2Title: "2. How We Use Your Information",
    section2Body:
      "Your data is used to provide vehicle rental, sales, and repair services; send booking confirmations and OTP codes; provide customer support; and improve our platform.",
    section3Title: "3. Data Sharing",
    section3Body:
      "We do not sell your personal data. We share information only with service providers necessary to operate TrendyWheels (e.g. SMS delivery). All providers are bound by data processing agreements.",
    section4Title: "4. Data Retention",
    section4Body:
      "Account data is retained while your account is active. After deletion, personal data is anonymized within 30 days. Transactional records may be retained for up to 7 years for legal compliance.",
    section5Title: "5. Your Rights",
    section5Body:
      "You have the right to access, correct, or delete your personal data at any time. To export all your data, go to Profile → Settings → Export My Data. To delete your account, contact support@trendywheelseg.com.",
    section6Title: "6. Security",
    section6Body:
      "All data is encrypted in transit (TLS 1.2+) and at rest. Authentication uses industry-standard JWT tokens. We never store passwords.",
    section7Title: "7. Contact",
    contactInquiries: "For privacy inquiries: privacy@trendywheelseg.com",
    contactLocation: "TrendyWheels — Cairo, Egypt",
  },
} as const;
