import { randomUUID } from "node:crypto";

import compression from "compression";
import cors from "cors";
import express from "express";
import type { Express, NextFunction, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";

import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { adminRoutes } from "./modules/admin/routes.js";
import { godModeRoutes } from "./modules/admin/godmode.js";
import { customerFeaturesRoutes } from "./modules/customer-features/routes.js";
import { authRoutes } from "./modules/auth/routes.js";
import { bookingRoutes } from "./modules/bookings/routes.js";
import { crmRoutes } from "./modules/crm/routes.js";
import { diagnosticsRoutes } from "./modules/diagnostics/routes.js";
import { healthRoutes } from "./modules/health/routes.js";
import { inventoryRoutes } from "./modules/inventory/routes.js";
import { kbRoutes } from "./modules/kb/routes.js";
import { maintenanceRoutes } from "./modules/maintenance/routes.js";
import { messageRoutes } from "./modules/messages/routes.js";
import { metricsMiddleware, metricsRoutes } from "./modules/metrics/routes.js";
import { notificationRoutes } from "./modules/notifications/routes.js";
import { orderRoutes } from "./modules/orders/routes.js";
import { productRoutes } from "./modules/products/routes.js";
import { invoiceRoutes } from "./modules/invoices/routes.js";
import { rentalListingRoutes } from "./modules/rental-listings/routes.js";
import { reservationRoutes } from "./modules/reservations/routes.js";
import { repairRoutes } from "./modules/repairs/routes.js";
import { salesRoutes } from "./modules/sales/routes.js";
import { serviceRequestsRoutes } from "./modules/service-requests/routes.js";
import { storageRoutes } from "./modules/storage/routes.js";
import { ticketRoutes } from "./modules/tickets/routes.js";
import { tradeInRoutes } from "./modules/trade-in/routes.js";
import { transportRoutes } from "./modules/transport/routes.js";
import { userRoutes } from "./modules/users/routes.js";
import { vehicleRoutes } from "./modules/vehicles/routes.js";
import { openapiSpec } from "./openapi.js";
import { logger } from "./utils/logger.js";

const app: Express = express();

// Trust the immediate reverse proxy (nginx on the VPS, Vercel edge in dev).
// Required by express-rate-limit's keyGenerator + accurate req.ip.
// Using a numeric hop count instead of `true` per express-rate-limit's
// security guidance (avoids spoofed X-Forwarded-For from arbitrary clients).
app.set("trust proxy", 1);

// ─── Global middleware ───────────────────────────────────────
// API only serves JSON, so we can lock CSP down hard. No inline scripts /
// styles, no third-party origins. Anything the API ever returned as HTML
// (Swagger UI) explicitly opts out below.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        connectSrc: ["'self'"],
        imgSrc: ["'self'", "data:"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    referrerPolicy: { policy: "no-referrer" },
    hsts:
      env.NODE_ENV === "production"
        ? { maxAge: 31_536_000, includeSubDomains: true, preload: true }
        : false,
  }),
);
app.use(
  cors({
    origin: env.CORS_ORIGINS.split(",").map((s) => s.trim()),
    credentials: true,
  }),
);
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// The checked-in smoke suite (apps/api/scripts/smoke-test.sh) fires ~100 requests
// in seconds from the box itself on every deploy, which would otherwise trip the
// 100/min global limiter mid-run (and made the suite fragile — one assertion away
// from the cap). Exempt it, but ONLY when the request is BOTH from loopback AND
// carries the smoke UA. External traffic always arrives via the reverse proxy
// with a real client IP (trust proxy = 1), so a loopback source address can't be
// forged from the internet; the UA is a second gate. Worst case a bypass only
// sidesteps a coarse anti-DoS limit — never auth or authorization.
const isLoopbackIp = (ip: string | undefined): boolean =>
  ip === "::1" || ip === "127.0.0.1" || ip === "::ffff:127.0.0.1";
const skipSmokeLocalhost = (req: Request): boolean => {
  const ua = req.headers["user-agent"];
  return isLoopbackIp(req.ip) && typeof ua === "string" && ua.startsWith("tw-smoke-test");
};

// Rate limiting — global
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    skip: skipSmokeLocalhost,
    message: { message: "Too many requests", code: "RATE_LIMIT", statusCode: 429 },
  }),
);

// Stricter rate limit for auth send-OTP / login endpoints (30 req / 15 min per IP).
// 5/15min was too tight even for legitimate testing across dashboards;
// 30 still blocks brute force while permitting normal multi-tab usage.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipSmokeLocalhost,
  message: {
    message: "Too many auth attempts, please try again later",
    code: "RATE_LIMIT_AUTH",
    statusCode: 429,
  },
});

// OTP verification gets a tighter limit keyed on the target phone (not just IP)
// so attackers cannot spread guesses across IPs against one phone. 6-digit OTPs
// have 10⁶ space and a 10-min window, so 5 attempts / 15 min keeps brute force
// well below feasibility.
const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const phone = (req.body as { phone?: string } | undefined)?.phone;
    return phone ? `otp:${phone}` : `otp-ip:${req.ip}`;
  },
  message: {
    message: "Too many OTP attempts. Wait a few minutes before retrying.",
    code: "RATE_LIMIT_OTP",
    statusCode: 429,
  },
});

// Refresh-token endpoint: stop token-enumeration brute force. Legitimate clients
// refresh roughly every access-token expiry (~1h), so 60 / 15min per IP is plenty
// while keeping the per-request bcrypt cost (currently O(n_active_tokens)) bounded
// under attack until the lookup is scoped per-user.
const refreshTokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many refresh attempts. Sign in again.",
    code: "RATE_LIMIT_REFRESH",
    statusCode: 429,
  },
});

// Request ID — propagates an x-request-id through every log line and into the
// response header so support can correlate user reports with server traces.
// Uses an upstream-provided id (nginx, Vercel edge) when present, generates one
// otherwise.
app.use((req: Request, res: Response, next: NextFunction) => {
  const incoming = req.headers["x-request-id"];
  const id =
    typeof incoming === "string" && incoming.length > 0 && incoming.length <= 64
      ? incoming
      : randomUUID();
  (req as Request & { id: string }).id = id;
  res.setHeader("X-Request-ID", id);
  next();
});

// Request logging
app.use((req, _res, next) => {
  logger.info(
    { method: req.method, url: req.url, requestId: (req as Request & { id: string }).id },
    "Incoming request",
  );
  next();
});

// Prometheus request-duration histogram — must run before route handlers so the
// `res.on("finish")` listener it registers fires for every request, including
// 404s. See modules/metrics/routes.ts.
app.use(metricsMiddleware);

// ─── Routes ──────────────────────────────────────────────────
app.use("/", healthRoutes);
// Mirror at /api/* so external probes that hit the API prefix also work.
// /api/healthz + /api/readyz now resolve to the same handlers — closes INC-009.
app.use("/api", healthRoutes);
app.use("/api/auth/send-otp", authLimiter);
app.use("/api/auth/login-method", authLimiter);
app.use("/api/auth/verify-otp", otpVerifyLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/refresh-token", refreshTokenLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/users", userRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/repairs", repairRoutes);
app.use("/api/service", serviceRequestsRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/storage", storageRoutes);
app.use("/api/kb", kbRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin", godModeRoutes);
// Prometheus scrape endpoint — GET /api/metrics. Auth is a shared-secret
// header (x-metrics-token === METRICS_TOKEN) handled inside the router.
app.use("/api", metricsRoutes);
// Diagnostics must be mounted before customerFeaturesRoutes — that router has
// a top-level authenticate middleware that intercepts every request entering
// its `/api` mount, which would block the public POST /api/client-errors.
app.use("/api", diagnosticsRoutes);
// Mount before customerFeaturesRoutes — that router has a top-level
// authenticate that would block public catalog browsing.
app.use("/api/products", productRoutes);
app.use("/api", customerFeaturesRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/crm", crmRoutes);
app.use("/api/maintenance", maintenanceRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/trade-in", tradeInRoutes);
app.use("/api/rental-listings", rentalListingRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/transport", transportRoutes);

// OpenAPI docs — Swagger UI needs inline scripts/styles, so opt out of strict CSP.
app.use(
  "/api/docs",
  helmet({ contentSecurityPolicy: false }),
  swaggerUi.serve,
  swaggerUi.setup(openapiSpec),
);
app.get("/api/openapi.json", (_req, res) => res.json(openapiSpec));

// ─── Error handling ──────────────────────────────────────────
app.use(errorHandler);

export { app };
