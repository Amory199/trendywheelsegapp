import { Prisma, type PrismaClient } from "@prisma/client";

import { logger } from "../utils/logger.js";

import { currentActor } from "./actor-context.js";

// Whitelist of Prisma model names (lowercase client-property form) we audit.
// Add a new model here and every create/update/delete is automatically logged.
const AUDITED_MODELS = new Set([
  "user",
  "booking",
  "vehicle",
  "salesListing",
  "repairRequest",
  "supportTicket",
  "promoCode",
  "pricingRule",
  "featureFlag",
  "systemConfig",
  "alertConfig",
  "businessHours",
  "holiday",
  "salesTarget",
  "lead",
]);

const AUDITED_OPS = new Set(["create", "update", "delete", "upsert"]);

// Fields we never want to leak into the audit JSON column.
const REDACTED_FIELDS = new Set([
  "passwordHash",
  "password",
  "tokenHash",
  "refreshToken",
  "otp",
  "otpHash",
]);

function redact<T>(value: T): T {
  if (value == null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(redact) as T;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = REDACTED_FIELDS.has(k) ? "[REDACTED]" : redact(v);
  }
  return out as T;
}

interface AuditPayload {
  action: string;
  entity: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  diff: Record<string, unknown> | null;
}

/**
 * Returns a Prisma client extension that intercepts every write on the
 * whitelisted models and, when an authenticated actor is present in
 * AsyncLocalStorage, persists an AuditLog row capturing the change.
 *
 * The extension uses the *base* prisma client (passed in) to write the
 * audit row so it never recurses into itself. Audit failures never throw —
 * the original mutation always returns to the caller unchanged.
 */
export function buildAuditExtension(base: PrismaClient) {
  return Prisma.defineExtension({
    name: "tw-audit",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const lowered = model.charAt(0).toLowerCase() + model.slice(1);
          if (!AUDITED_MODELS.has(lowered) || !AUDITED_OPS.has(operation)) {
            return query(args);
          }

          const actor = currentActor();
          if (!actor) {
            // Server-driven mutation (worker, signup pre-auth) — skip audit.
            return query(args);
          }

          const result = (await query(args)) as { id?: string } | null;

          // Fire-and-forget — we never block the caller on the audit write.
          const payload = buildPayload(lowered, operation, args, result);
          void persistAudit(base, actor, payload);
          return result;
        },
      },
    },
  });
}

function buildPayload(
  model: string,
  operation: string,
  args: unknown,
  result: { id?: string } | null,
): AuditPayload {
  const a = args as { where?: { id?: string }; data?: Record<string, unknown> };
  const entityId = result?.id ?? a?.where?.id ?? null;
  return {
    action: `${model}.${operation}`,
    entity: model,
    entityId,
    metadata: { where: redact(a?.where ?? null) } as Record<string, unknown>,
    diff: a?.data ? (redact(a.data) as Record<string, unknown>) : null,
  };
}

async function persistAudit(
  base: PrismaClient,
  actor: NonNullable<ReturnType<typeof currentActor>>,
  payload: AuditPayload,
): Promise<void> {
  try {
    await base.auditLog.create({
      data: {
        userId: actor.actingAsId ?? actor.userId,
        actingAsId: actor.actingAsId ? actor.userId : null,
        action: payload.action,
        entity: payload.entity,
        entityId: payload.entityId,
        metadata: payload.metadata as never,
        diff: payload.diff as never,
        ipAddress: actor.ipAddress ?? null,
        userAgent: actor.userAgent ?? null,
      },
    });
  } catch (err) {
    logger.warn({ err, action: payload.action }, "AuditLog write failed (non-fatal)");
  }
}
