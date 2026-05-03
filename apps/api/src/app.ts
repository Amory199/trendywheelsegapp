import compression from "compression";
import cors from "cors";
import express from "express";
import type { Express } from "express";
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
import { notificationRoutes } from "./modules/notifications/routes.js";
import { repairRoutes } from "./modules/repairs/routes.js";
import { salesRoutes } from "./modules/sales/routes.js";
import { storageRoutes } from "./modules/storage/routes.js";
import { ticketRoutes } from "./modules/tickets/routes.js";
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
app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGINS.split(",").map((s) => s.trim()),
    credentials: true,
  }),
);
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting — global
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
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

// Request logging
app.use((req, _res, next) => {
  logger.info({ method: req.method, url: req.url }, "Incoming request");
  next();
});

// ─── Routes ──────────────────────────────────────────────────
app.use("/", healthRoutes);
app.use("/api/auth/send-otp", authLimiter);
app.use("/api/auth/verify-otp", otpVerifyLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/users", userRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/repairs", repairRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/storage", storageRoutes);
app.use("/api/kb", kbRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin", godModeRoutes);
// Diagnostics must be mounted before customerFeaturesRoutes — that router has
// a top-level authenticate middleware that intercepts every request entering
// its `/api` mount, which would block the public POST /api/client-errors.
app.use("/api", diagnosticsRoutes);
app.use("/api", customerFeaturesRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/crm", crmRoutes);
app.use("/api/maintenance", maintenanceRoutes);

// OpenAPI docs
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openapiSpec));
app.get("/api/openapi.json", (_req, res) => res.json(openapiSpec));

// ─── Error handling ──────────────────────────────────────────
app.use(errorHandler);

export { app };
