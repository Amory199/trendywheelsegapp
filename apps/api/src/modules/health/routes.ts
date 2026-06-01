import { Router, type Router as RouterType } from "express";

import { prisma } from "../../config/database.js";
import { redis } from "../../config/redis.js";

const router: RouterType = Router();

router.get("/healthz", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
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
