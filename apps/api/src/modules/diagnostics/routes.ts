import { Router, type Router as RouterType } from "express";
import { z } from "zod";

import { authenticate, authorize } from "../../middleware/auth.js";
import { prisma } from "../../config/database.js";
import { type ErrorLevel, type ErrorSource, writeError } from "../../utils/error-sink.js";

const router: RouterType = Router();

// ─── Anonymous client error reporting ──────────────────────────────────────
// Frontend (web + mobile) posts unhandled errors here. We accept anonymous
// reports because crashes can happen before / after auth — we still want to
// see them. The shared rate limit on /api keeps abuse in check.
const clientErrorSchema = z.object({
  level: z.enum(["error", "warn", "fatal"]).default("error"),
  source: z.enum(["admin", "support", "inventory", "customer", "mobile"]),
  message: z.string().min(1).max(2000),
  stack: z.string().max(20_000).optional(),
  route: z.string().max(500).optional(),
  metadata: z.record(z.unknown()).optional(),
});

router.post("/client-errors", async (req, res) => {
  const parsed = clientErrorSchema.parse(req.body);
  const userAgent = req.headers["user-agent"] ?? null;
  const ipFromHeader = (req.headers["x-forwarded-for"] as string | undefined)
    ?.split(",")[0]
    ?.trim();
  await writeError({
    level: parsed.level as ErrorLevel,
    source: parsed.source as ErrorSource,
    message: parsed.message,
    stack: parsed.stack ?? null,
    route: parsed.route ?? null,
    method: null,
    statusCode: null,
    userId: req.user?.userId ?? null,
    userAgent: typeof userAgent === "string" ? userAgent : null,
    ipAddress: ipFromHeader || req.ip || null,
    metadata: parsed.metadata ?? null,
  });
  res.status(202).json({ accepted: true });
});

// ─── Admin / staff log viewer ──────────────────────────────────────────────
router.use("/admin/error-logs", authenticate, authorize("admin", "staff"));

router.get("/admin/error-logs", async (req, res) => {
  const limit = Math.min(500, Number(req.query.limit) || 100);
  const skip = Math.max(0, Number(req.query.skip) || 0);
  const where: Record<string, unknown> = {};
  if (req.query.level) where.level = String(req.query.level);
  if (req.query.source) where.source = String(req.query.source);
  if (req.query.userId) where.userId = String(req.query.userId);
  if (req.query.unresolved === "1") where.resolvedAt = null;
  if (req.query.search) {
    const q = String(req.query.search);
    where.OR = [
      { message: { contains: q, mode: "insensitive" } },
      { route: { contains: q, mode: "insensitive" } },
    ];
  }

  const [items, total, counts] = await Promise.all([
    prisma.errorLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip,
    }),
    prisma.errorLog.count({ where }),
    prisma.errorLog.groupBy({
      by: ["level"],
      where: { resolvedAt: null },
      _count: { _all: true },
    }),
  ]);

  res.json({ data: items, total, limit, skip, openCounts: counts });
});

router.post("/admin/error-logs/:id/resolve", async (req, res) => {
  await prisma.errorLog.update({
    where: { id: req.params.id },
    data: { resolvedAt: new Date() },
  });
  res.json({ success: true });
});

router.post("/admin/error-logs/resolve-all", async (req, res) => {
  const where: Record<string, unknown> = { resolvedAt: null };
  if (req.body?.level) where.level = req.body.level;
  if (req.body?.source) where.source = req.body.source;
  const result = await prisma.errorLog.updateMany({ where, data: { resolvedAt: new Date() } });
  res.json({ resolved: result.count });
});

export { router as diagnosticsRoutes };
