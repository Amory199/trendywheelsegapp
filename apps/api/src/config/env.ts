import "dotenv/config";

import { bool, cleanEnv, port, str, url } from "envalid";

export const env = cleanEnv(process.env, {
  NODE_ENV: str({ choices: ["development", "production", "test"], default: "development" }),
  PORT: port({ default: 4000 }),
  DATABASE_URL: url(),
  REDIS_URL: url({ default: "redis://localhost:6379" }),

  // JWT
  JWT_PRIVATE_KEY: str(),
  JWT_PUBLIC_KEY: str(),
  JWT_ACCESS_EXPIRY: str({ default: "24h" }),
  JWT_REFRESH_EXPIRY: str({ default: "90d" }),

  // Twilio (optional in dev)
  TWILIO_ACCOUNT_SID: str({ default: "" }),
  TWILIO_AUTH_TOKEN: str({ default: "" }),
  TWILIO_PHONE_NUMBER: str({ default: "" }),

  // Trial OTP bypass — accepts hardcoded codes for the four pinned test
  // accounts. Must be FALSE in production. See auth/service.ts TRIAL_OTP_BYPASS.
  ENABLE_TRIAL_OTP_BYPASS: bool({ default: false }),

  // Akedly OTP delivery (SMS). When AKEDLY_ENABLED, sendOtp() delivers the
  // server-generated code via Akedly's V1.2 REST API (challenge → PoW → send).
  // We still own the code + verify against otp_codes, so manual-admin OTP and
  // the demo bypass are unaffected — Akedly is purely the SMS transport that
  // replaces Firebase. See modules/auth/akedly.ts + decision doc.
  AKEDLY_ENABLED: bool({ default: false }),
  AKEDLY_API_KEY: str({ default: "" }),
  AKEDLY_PIPELINE_ID: str({ default: "" }),
  AKEDLY_BASE_URL: str({ default: "https://api.akedly.io/api/v1.2" }),
  // Svix-style HMAC secret ("whsec_…") for Akedly's back-end callback. Set it to
  // enable POST /auth/akedly/webhook — while empty the route refuses every call
  // (503) rather than trusting an unverified delivery report.
  AKEDLY_WEBHOOK_SECRET: str({ default: "" }),

  // Local filesystem-backed object storage (replaced MinIO/S3).
  UPLOADS_DIR: str({ default: "/var/lib/trendywheels/uploads" }),
  // Public URL clients use to fetch uploaded objects (served by nginx).
  UPLOADS_PUBLIC_URL: url({ default: "https://cdn.trendywheelseg.com" }),
  // Public origin of this API — used to build presigned PUT URLs.
  API_PUBLIC_URL: url({ default: "https://api.trendywheelseg.com" }),
  // HMAC secret used to sign upload URLs. Keep secret; rotate to invalidate
  // any in-flight signed URLs.
  STORAGE_SIGNING_SECRET: str(),

  // Sentry (optional)
  SENTRY_DSN: str({ default: "" }),

  // Firebase project ID — required for verifying Firebase Phone Auth ID tokens.
  FIREBASE_PROJECT_ID: str({ default: "" }),

  // LEGACY — no longer consulted by auth. Staff/admin now sign in via a real
  // Firebase SMS OTP (see issueTokensForPhone, decision 2026-06-17), so this
  // allow-list was removed from the auth path. Kept only so a lingering prod
  // value doesn't fail env parsing; safe to leave empty.
  STAFF_TEST_PHONES: str({ default: "" }),

  // SendGrid (optional)
  SENDGRID_API_KEY: str({ default: "" }),

  // Mobile force-update gate (served by GET /api/app-config). Bump
  // MIN_MOBILE_APP_VERSION past a binary's version to lock it out after a
  // breaking API change. Store URLs power the "Update now" button.
  MIN_MOBILE_APP_VERSION: str({ default: "1.0.0" }),
  IOS_STORE_URL: str({ default: "https://apps.apple.com/app/id6777470914" }),
  ANDROID_STORE_URL: str({
    default: "https://play.google.com/store/apps/details?id=com.trendywheels.app",
  }),

  // CORS
  CORS_ORIGINS: str({
    default:
      "http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003",
  }),
});
