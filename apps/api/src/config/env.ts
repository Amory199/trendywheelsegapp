import "dotenv/config";

import { cleanEnv, port, str, url } from "envalid";

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

  // SendGrid (optional)
  SENDGRID_API_KEY: str({ default: "" }),

  // CORS
  CORS_ORIGINS: str({
    default:
      "http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003",
  }),
});
