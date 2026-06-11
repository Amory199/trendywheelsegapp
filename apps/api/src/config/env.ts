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
  JWT_REFRESH_EXPIRY: str({ default: "30d" }),

  // Twilio (optional in dev)
  TWILIO_ACCOUNT_SID: str({ default: "" }),
  TWILIO_AUTH_TOKEN: str({ default: "" }),
  TWILIO_PHONE_NUMBER: str({ default: "" }),

  // Trial OTP bypass — accepts hardcoded codes for the four pinned test
  // accounts. Must be FALSE in production. See auth/service.ts TRIAL_OTP_BYPASS.
  ENABLE_TRIAL_OTP_BYPASS: bool({ default: false }),

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

  // Comma-separated allow-list of Firebase test phone numbers that are
  // permitted to authenticate as staff/admin (bypasses the customer-only
  // restriction in issueTokensForPhone). The phone must also exist as a
  // seeded user with a staffRole. Dev/test only — clear before prod launch.
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
