import pino from "pino";

import { env } from "../config/env.js";

export const logger = pino({
  level: env.NODE_ENV === "production" ? "info" : "debug",
  transport:
    env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: { colorize: true },
        }
      : undefined,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "*.password",
      "*.passwordHash",
      "*.token",
      "*.tokenHash",
      "*.refreshToken",
      "*.otp",
      "*.otpHash",
      "*.phone",
      "*.phoneNumber",
      "*.email",
    ],
    censor: "[REDACTED]",
  },
});
