import { prisma } from "../../config/database.js";
import { logger } from "../../utils/logger.js";

const CLAIM_TTL_MS = 24 * 60 * 60 * 1000;
const FIRST_TOUCH_TTL_MS = 30 * 60 * 1000;

export async function recordActivity(
  leadId: string,
  actorId: string | null,
  type: string,
  body: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await prisma.leadActivity.create({
    data: {
      leadId,
      actorId,
      type,
      body,
      metadata: (metadata ?? null) as never,
    },
  });
}

/**
 * Round-robin assignment to active sales agents, weighted by salesAssignmentWeight,
 * preferring the agent with the fewest open leads to balance load.
 */
export async function assignLeadRoundRobin(leadId: string): Promise<string | null> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead || lead.ownerId) return lead?.ownerId ?? null;

  const agents = await prisma.user.findMany({
    where: {
      status: "active",
      OR: [{ staffRole: "sales" }, { staffRole: "admin" }],
    },
    select: {
      id: true,
      salesAssignmentWeight: true,
    },
  });

  if (agents.length === 0) {
    logger.warn({ leadId }, "No sales agents available for assignment");
    return null;
  }

  type Agent = { id: string; salesAssignmentWeight: number };
  const agentsTyped = agents as Agent[];
  const openCounts = await prisma.lead.groupBy({
    by: ["ownerId"],
    where: { ownerId: { in: agentsTyped.map((a: Agent) => a.id) }, status: { notIn: ["won", "lost"] } },
    _count: { _all: true },
  });

  type OpenCount = { ownerId: string | null; _count: { _all: number } };
  const countMap = new Map<string, number>(
    (openCounts as unknown as OpenCount[])
      .filter((c: OpenCount): c is OpenCount & { ownerId: string } => c.ownerId !== null)
      .map((c) => [c.ownerId, c._count._all] as const),
  );

  // Lowest (openCount / weight) first.
  agentsTyped.sort((a: Agent, b: Agent) => {
    const ai = (countMap.get(a.id) ?? 0) / Math.max(1, a.salesAssignmentWeight);
    const bi = (countMap.get(b.id) ?? 0) / Math.max(1, b.salesAssignmentWeight);
    return ai - bi;
  });

  const chosen = agentsTyped[0];
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      ownerId: chosen.id,
      assignedAt: new Date(),
      claimDeadline: new Date(Date.now() + FIRST_TOUCH_TTL_MS),
      lastActivityAt: new Date(),
    },
  });
  await recordActivity(leadId, null, "assigned", `Auto-assigned to agent ${chosen.id}`);
  logger.info({ leadId, agentId: chosen.id }, "Lead assigned via round-robin");
  return chosen.id;
}

/**
 * Sweep: leads whose claimDeadline has passed without owner activity →
 * unassign + re-pool for round-robin.
 */
export async function sweepStaleLeads(): Promise<{ reassigned: number }> {
  const now = new Date();
  const stale = await prisma.lead.findMany({
    where: {
      ownerId: { not: null },
      status: { notIn: ["won", "lost"] },
      claimDeadline: { lt: now },
    },
    select: { id: true, ownerId: true, reassignmentCount: true },
  });

  for (const lead of stale) {
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        ownerId: null,
        assignedAt: null,
        claimDeadline: null,
        reassignmentCount: { increment: 1 },
        lastActivityAt: new Date(),
      },
    });
    await recordActivity(lead.id, null, "reassigned", "Auto-released: claim deadline expired");
    await assignLeadRoundRobin(lead.id);
  }

  if (stale.length > 0) {
    logger.info({ count: stale.length }, "Stale leads reassigned");
  }
  return { reassigned: stale.length };
}

export async function computeAgentTargets(agentId: string): Promise<{
  targetMonthly: number;
  wonAmount: number;
  wonCount: number;
  progressPct: number | null;
  openValue: number;
  openCount: number;
}> {
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const agent = await prisma.user.findUnique({ where: { id: agentId } });
  const target = agent?.salesTargetMonthly ? Number(agent.salesTargetMonthly) : 0;

  const [won, open] = await Promise.all([
    prisma.lead.aggregate({
      where: { ownerId: agentId, status: "won", closedAt: { gte: monthStart } },
      _sum: { estimatedValue: true },
      _count: { _all: true },
    }),
    prisma.lead.aggregate({
      where: { ownerId: agentId, status: { notIn: ["won", "lost"] } },
      _sum: { estimatedValue: true },
      _count: { _all: true },
    }),
  ]);

  const wonAmount = Number(won._sum.estimatedValue ?? 0);
  return {
    targetMonthly: target,
    wonAmount,
    wonCount: won._count._all,
    progressPct: target > 0 ? Math.min(100, Math.round((wonAmount / target) * 100)) : null,
    openValue: Number(open._sum.estimatedValue ?? 0),
    openCount: open._count._all,
  };
}

export { CLAIM_TTL_MS, FIRST_TOUCH_TTL_MS };
