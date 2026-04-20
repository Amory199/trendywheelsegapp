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

  // MinIO / S3
  S3_ENDPOINT: url({ default: "http://localhost:9000" }),
  S3_ACCESS_KEY: str({ default: "minioadmin" }),
  S3_SECRET_KEY: str({ default: "minioadmin" }),
  S3_BUCKET: str({ default: "trendywheels" }),
  S3_REGION: str({ default: "us-east-1" }),

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
