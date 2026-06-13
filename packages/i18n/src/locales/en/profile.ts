export default {
  // Signed-out fallback (app/(tabs)/profile.tsx)
  notSignedIn: "Not signed in",
  signIn: "Sign in",
  welcome: "Welcome",

  // KPI strip labels
  kpiPoints: "Points",
  kpiBookings: "Bookings",
  kpiListings: "Listings",

  // Activity cards
  activity: {
    bookingsTitle: "My bookings",
    bookingsEmpty: "No active bookings yet",
    ordersTitle: "My orders",
    ordersEmpty: "No purchases yet",
    savedTitle: "Saved vehicles",
    savedSubtitle: "Vehicles you saved for later",
    listingsTitle: "My listings",
    listingsEmpty: "Post your first listing",
    repairsTitle: "My repairs",
    repairsEmpty: "No repair requests",
    rentalsTitle: "Rental listings",
    rentalsEmpty: "List your cart for managed rental",
    messagesTitle: "Messages",
    messagesEmpty: "No new messages",
    // Composed subtitles: "{count} total" and "{count} total · latest: {status}"
    total: "total",
    latest: "latest",
    unread: "unread",
  },

  // HeroStrip tier pill — "{tier} tier"
  tierPill: "tier",

  // LoyaltyCard
  loyaltyPoints: "Loyalty points",
  ptsToNext: "pts to", // composed: "{remaining} pts to {tier}"
  topTier: "Top tier — you've maxed out 🏆",

  // ReferralCard
  referral: {
    codeLabel: "REFERRAL CODE",
    blurb: "Friends earn 500 pts on first ride. So do you.",
    joined: "joined",
    completed: "completed",
    share: "SHARE",
    shareMessage:
      "Join me on TrendyWheels — use my code {code} for a discount on your first ride: https://trendywheelseg.com",
  },

  // SettingsList rows
  settingsList: {
    editProfile: "Edit profile",
    notifications: "Notifications",
    language: "Language",
    privacy: "Privacy",
    helpSupport: "Help & support",
    deleteAccount: "Delete account",
    signOut: "Sign out",
    deleteTitle: "Delete account?",
    deleteMessage:
      "This permanently removes your data. You will receive a confirmation message before deletion.",
  },

  // Edit profile screen (app/profile/edit.tsx)
  edit: {
    title: "Edit Profile",
    tapToChangePhoto: "Tap to change photo",
    fullName: "Full Name",
    fullNamePlaceholder: "Your full name",
    emailAddress: "Email Address",
    emailPlaceholder: "Optional",
    phoneNumber: "Phone Number",
    phoneCannotChange: "Phone number cannot be changed",
    member: "Member", // composed: "{Tier} Member"
    points: "points", // composed: "{n} points"
    saveFailed: "Failed to save changes",
    saved: "Saved!",
    saveChanges: "Save Changes",
  },

  // Favorites screen (app/profile/favorites.tsx)
  favorites: {
    title: "Saved Vehicles",
    emptyTitle: "Nothing saved yet",
    emptyHint: "Tap the heart on any vehicle to keep it here.",
    browse: "Browse vehicles",
    perDay: "/day", // composed: "{price} /day"
  },

  // License capture screen (app/profile/license.tsx)
  license: {
    title: "Driver's License",
    heading: "One step before you ride",
    subtitle:
      "We need a valid driver's license on file to confirm rentals. Stored encrypted, shared only with the team that handles your booking.",
    numberLabel: "License number",
    numberPlaceholder: "e.g. 12345678",
    expiryLabel: "Expiry date",
    pickDate: "Tap to pick a date",
    photoLabel: "Photo of your license",
    tapToUpload: "Tap to upload",
    saveContinue: "Save and continue",
    notNow: "Not now",
    saveErrorTitle: "Couldn't save",
    saveErrorBody: "Try again",
  },

  // Notifications screen (app/profile/notifications.tsx)
  notifications: {
    title: "Notifications",
    markAll: "Mark all",
    empty: "No notifications yet",
  },

  // Settings screen (app/profile/settings.tsx)
  settings: {
    title: "Settings",
    appearance: "Appearance",
    themeSystem: "Match system",
    themeLight: "Light",
    themeDark: "Dark",
    themeSystemHint: "Follows your phone's setting",
    themeLightHint: "Always light theme",
    themeDarkHint: "Always dark theme",
    language: "Language",
    english: "English",
    englishHint: "Left-to-right",
    arabic: "العربية",
    arabicHint: "Right-to-left",
    notifications: "Notifications",
    pushTitle: "Push Notifications",
    pushHint: "In-app alerts for bookings, messages",
    emailTitle: "Email Notifications",
    emailHint: "Booking confirmations, receipts",
    smsTitle: "SMS Alerts",
    smsHint: "OTP, urgent updates",
    whatsappTitle: "WhatsApp Notifications",
    whatsappHint: "Updates via WhatsApp",
    privacy: "Privacy",
    marketingTitle: "Marketing Communications",
    marketingHint: "Deals, promotions, and offers",
    privacyPolicy: "Privacy Policy",
    privacyPolicyHint: "How we handle your data",
    exportData: "Export My Data",
    exportDataHint: "Download all your personal data",
    exportConfirmTitle: "Export My Data",
    exportConfirmBody: "Your data will be downloaded as a JSON file.",
    export: "Export",
    account: "Account",
    deleteAccount: "Delete Account",
    deleteAccountHint: "Permanently remove your data",
    deleteConfirmBody:
      "This will permanently delete your account and anonymize all personal data. This cannot be undone.",
    deleteConfirmTitle2: "Are you sure?",
    deleteConfirmBody2:
      "Your bookings, messages, and all activity will be anonymized. You will be logged out.",
    deleteConfirmYes: "Yes, delete my account",
    appCopyright: "© 2026 TrendyWheels Egypt",
    saveFailed: "Failed to save settings",
    saved: "Saved!",
    saveSettings: "Save Settings",
  },
} as const;
