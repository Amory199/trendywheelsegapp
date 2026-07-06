import { Router, type Router as RouterType } from "express";

import { prisma } from "../../config/database.js";
import { env } from "../../config/env.js";
import { redis } from "../../config/redis.js";

const router: RouterType = Router();

router.get("/healthz", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Public app metadata checked by the mobile app at boot. minSupportedVersion
// lets us retire old binaries before a breaking API change ships: any app
// below it shows a blocking "update required" screen. Bump via
// MIN_MOBILE_APP_VERSION in .env — no mobile release needed.
router.get("/app-config", (_req, res) => {
  res.json({
    data: {
      minSupportedVersion: env.MIN_MOBILE_APP_VERSION,
      iosStoreUrl: env.IOS_STORE_URL,
      androidStoreUrl: env.ANDROID_STORE_URL,
    },
  });
});

// Public category visibility for the customer app (rent + discovery). Guests
// browse, so this must be unauthenticated. Returns the HIDDEN set the admin
// configured; the client hides those and shows everything else. Defaults to an
// empty set (all visible) if no config row exists yet.
router.get("/categories/visibility", async (_req, res) => {
  const config = await prisma.systemConfig.findFirst({ orderBy: { updatedAt: "desc" } });
  const hidden = Array.isArray(config?.hiddenCategories) ? config.hiddenCategories : [];
  res.json({ data: { hidden } });
});

router.get("/readyz", async (_req, res) => {
  const checks: Record<string, string> = {};

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch {
    checks.database = "fail";
  }

  try {
    await redis.ping();
    checks.redis = "ok";
  } catch {
    checks.redis = "fail";
  }

  const allOk = Object.values(checks).every((v) => v === "ok");
  res.status(allOk ? 200 : 503).json({ status: allOk ? "ready" : "not ready", checks });
});

router.get("/health", async (_req, res) => {
  let db: "ok" | "fail" = "ok";
  let redisStatus: "ok" | "fail" = "ok";

  try {
    await prisma.$queryRawUnsafe("SELECT 1");
  } catch {
    db = "fail";
  }

  try {
    await redis.ping();
  } catch {
    redisStatus = "fail";
  }

  const allOk = db === "ok" && redisStatus === "ok";
  res.status(allOk ? 200 : 503).json({
    db,
    redis: redisStatus,
    uptime: process.uptime(),
    version: process.env.npm_package_version ?? "unknown",
  });
});

export { router as healthRoutes };
