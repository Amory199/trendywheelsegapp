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
import { authRoutes } from "./modules/auth/routes.js";
import { bookingRoutes } from "./modules/bookings/routes.js";
import { healthRoutes } from "./modules/health/routes.js";
import { messageRoutes } from "./modules/messages/routes.js";
import { notificationRoutes } from "./modules/notifications/routes.js";
import { repairRoutes } from "./modules/repairs/routes.js";
import { salesRoutes } from "./modules/sales/routes.js";
import { storageRoutes } from "./modules/storage/routes.js";
import { userRoutes } from "./modules/users/routes.js";
import { vehicleRoutes } from "./modules/vehicles/routes.js";
import { openapiSpec } from "./openapi.js";
import { logger } from "./utils/logger.js";

const app: Express = express();

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

// Rate limiting
app.use(
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many requests", code: "RATE_LIMIT", statusCode: 429 },
  }),
);

// Request logging
app.use((req, _res, next) => {
  logger.info({ method: req.method, url: req.url }, "Incoming request");
  next();
});

// ─── Routes ──────────────────────────────────────────────────
app.use("/", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/users", userRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/repairs", repairRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/storage", storageRoutes);
app.use("/api/admin", adminRoutes);

// OpenAPI docs
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openapiSpec));
app.get("/api/openapi.json", (_req, res) => res.json(openapiSpec));

// ─── Error handling ──────────────────────────────────────────
app.use(errorHandler);

export { app };
