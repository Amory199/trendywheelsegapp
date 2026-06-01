import {
  Router,
  type Router as RouterType,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import promClient from "prom-client";

// Collect default Node.js process metrics (memory, CPU, event loop, GC, handles, etc.).
// Called once at module load — prom-client guards against duplicate registration via the
// default registry, but invoking it twice would still throw, so this lives at module scope.
promClient.collectDefaultMetrics();

// Histogram of HTTP request durations, partitioned by method + route + status.
// Buckets cover sub-10ms cache hits up through 10s long-tail timeouts so we can
// alert on p95/p99 latency without losing fidelity at either end.
const httpRequestDurationSeconds = new promClient.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status"] as const,
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

/**
 * Express middleware that observes every request's wall-clock duration into the
 * `http_request_duration_seconds` histogram. Uses `req.route?.path` once Express
 * has resolved a route handler — falling back to `req.path` for 404s and
 * pre-route middleware — so we keep cardinality bounded (no per-id labels).
 */
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const endTimer = httpRequestDurationSeconds.startTimer();
  res.on("finish", () => {
    // `req.route?.path` is only populated after route matching; for unmatched
    // requests fall back to `req.path` to avoid losing the observation entirely.
    const matchedPath = req.route?.path as string | undefined;
    const fallbackPath = (req.baseUrl ?? "") + (req.path ?? "");
    const routeLabel: string = matchedPath ?? (fallbackPath || req.path || "unknown");
    endTimer({
      method: req.method,
      route: routeLabel,
      status: String(res.statusCode),
    });
  });
  next();
};

const router: RouterType = Router();

// GET /metrics — Prometheus scrape endpoint.
// Protected by a shared-secret header so it isn't world-readable when the API
// is reachable from the public internet. The Prometheus scraper sets
// `x-metrics-token` to the same value as METRICS_TOKEN. If the env var is
// unset we fail closed: 401 for every caller.
router.get("/metrics", async (req: Request, res: Response) => {
  const expected = process.env.METRICS_TOKEN;
  const provided = req.header("x-metrics-token");
  if (!expected || provided !== expected) {
    res
      .status(401)
      .json({ message: "Unauthorized", code: "METRICS_UNAUTHORIZED", statusCode: 401 });
    return;
  }
  res.setHeader("Content-Type", promClient.register.contentType);
  res.send(await promClient.register.metrics());
});

export { router as metricsRoutes };
