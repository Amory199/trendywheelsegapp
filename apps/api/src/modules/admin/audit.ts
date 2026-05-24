// Audit-log helper shared by godmode routes. Records every privileged write
// (promo, pricing, template, broadcast, refund, impersonation, etc.) so we
// have a forensic trail. Failures are swallowed-and-logged — audit must
// never block the underlying mutation.

import { prisma } from "../../config/database.js";
import { logger } from "../../utils/logger.js";

export async function writeAudit(
  userId: string,
  actingAsId: string | null,
  action: string,
  entity: string,
  entityId: string | null,
  diff: unknown,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        actingAsId: actingAsId ?? null,
        action,
        entity,
        entityId: entityId ?? null,
        diff: diff as never,
      },
    });
  } catch (err) {
    logger.error({ err, action, entity }, "Failed to write audit log");
  }
}
