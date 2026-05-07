import * as Sentry from "@sentry/node";

import { env } from "../config/env.js";
import { logger } from "./logger.js";

let initialized = false;

export function initSentry(): void {
  if (initialized) return;
  if (!env.SENTRY_DSN) {
    logger.info("Sentry disabled (no DSN configured)");
    return;
  }
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: env.NODE_ENV === "production" ? 0.1 : 1.0,
    profilesSampleRate: 0,
    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers["authorization"];
        delete event.request.headers["cookie"];
      }
      return event;
    },
  });
  initialized = true;
  logger.info("Sentry initialized");
}

export { Sentry };
