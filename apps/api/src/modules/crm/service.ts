import { prisma } from "../../config/database.js";
import { notificationsQueue } from "../../queues/index.js";
import { logger } from "../../utils/logger.js";

const FIRST_TOUCH_TTL_MS = 30 * 60 * 1000;

export interface CrmRules {
  firstCallWithinMinutes: number;
  followUpCallWithinHours: number;
  reassignAfterHours: number;
  maxReassignmentsBeforeEscalation: number;
  notifyOnAssignment: boolean;
  notifyOnEscalation: boolean;
  enforceRules: boolean;
}

export async function getCrmRules(): Promise<CrmRules> {
  const row =
    (await prisma.crmRules.findFirst({ orderBy: { updatedAt: "desc" } })) ??
    (await prisma.crmRules.create({ data: {} }));
  return {
    firstCallWithinMinutes: row.firstCallWithinMinutes,
    followUpCallWithinHours: row.followUpCallWithinHours,
    reassignAfterHours: row.reassignAfterHours,
    maxReassignmentsBeforeEscalation: row.maxReassignmentsBeforeEscalation,
    notifyOnAssignment: row.notifyOnAssignment,
    notifyOnEscalation: row.notifyOnEscalation,
    enforceRules: row.enforceRules,
  };
}

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

  if (type === "call") {
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        lastCallAt: new Date(),
        lastActivityAt: new Date(),
        callCount: { increment: 1 },
      },
    });
  } else {
    await prisma.lead.update({
      where: { id: leadId },
      data: { lastActivityAt: new Date() },
    });
  }
}

/**
 * Round-robin assignment to active sales agents, weighted by salesAssignmentWeight,
 * preferring the agent with the fewest open leads to balance load.
 */
export async function assignLeadRoundRobin(
  leadId: string,
  excludeAgentIds: string[] = [],
): Promise<string | null> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return null;
  if (lead.ownerId && !excludeAgentIds.includes(lead.ownerId)) return lead.ownerId;

  const agents = await prisma.user.findMany({
    where: {
      status: "active",
      OR: [{ staffRole: "sales" }, { staffRole: "admin" }],
      id: { notIn: excludeAgentIds },
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
    where: {
      ownerId: { in: agentsTyped.map((a: Agent) => a.id) },
      status: { notIn: ["won", "lost"] },
    },
    _count: { _all: true },
  });

  type OpenCount = { ownerId: string | null; _count: { _all: number } };
  const countMap = new Map<string, number>(
    (openCounts as unknown as OpenCount[])
      .filter((c: OpenCount): c is OpenCount & { ownerId: string } => c.ownerId !== null)
      .map((c) => [c.ownerId, c._count._all] as const),
  );

  agentsTyped.sort((a: Agent, b: Agent) => {
    const ai = (countMap.get(a.id) ?? 0) / Math.max(1, a.salesAssignmentWeight);
    const bi = (countMap.get(b.id) ?? 0) / Math.max(1, b.salesAssignmentWeight);
    return ai - bi;
  });

  const chosen = agentsTyped[0];
  const rules = await getCrmRules();
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      ownerId: chosen.id,
      assignedAt: new Date(),
      claimDeadline: new Date(Date.now() + rules.firstCallWithinMinutes * 60 * 1000),
      lastActivityAt: new Date(),
    },
  });
  await recordActivity(leadId, null, "assigned", `Auto-assigned to agent ${chosen.id}`);

  if (rules.notifyOnAssignment) {
    await notificationsQueue.add(
      `lead-assigned-${leadId}-${chosen.id}`,
      {
        userId: chosen.id,
        type: "lead_assigned",
        title: "New lead assigned",
        body: `Call ${lead.contactName} within ${rules.firstCallWithinMinutes} minutes`,
        data: { leadId, contactName: lead.contactName },
      },
      { removeOnComplete: true },
    );
  }

  logger.info({ leadId, agentId: chosen.id }, "Lead assigned via round-robin");
  return chosen.id;
}

/**
 * Strict sweep: enforces three call-based rules.
 *
 * 1. First-touch: a freshly assigned lead with no call within `firstCallWithinMinutes` → reassign.
 * 2. Follow-up:    a contacted lead whose `lastCallAt` is older than `followUpCallWithinHours` → reassign.
 * 3. Hard cap:    any open lead whose `assignedAt` is older than `reassignAfterHours` and has zero
 *                 calls (per `callCount`) → reassign and excludes the previous owner from RR.
 *
 * After `maxReassignmentsBeforeEscalation` reassignments without a call, escalate to admin
 * (notification fired, lead flagged with `escalationLevel`).
 */
export async function sweepStaleLeads(): Promise<{ reassigned: number; escalated: number }> {
  const rules = await getCrmRules();
  if (!rules.enforceRules) return { reassigned: 0, escalated: 0 };

  const now = Date.now();
  const firstTouchCutoff = new Date(now - rules.firstCallWithinMinutes * 60 * 1000);
  const followUpCutoff = new Date(now - rules.followUpCallWithinHours * 60 * 60 * 1000);
  const hardCapCutoff = new Date(now - rules.reassignAfterHours * 60 * 60 * 1000);

  const candidates = await prisma.lead.findMany({
    where: {
      ownerId: { not: null },
      status: { notIn: ["won", "lost"] },
      OR: [
        // Rule 1: assigned recently, never called, claim deadline expired
        { callCount: 0, assignedAt: { lt: firstTouchCutoff } },
        // Rule 2: previously called, but stale
        { callCount: { gt: 0 }, lastCallAt: { lt: followUpCutoff } },
        // Rule 3: hard cap regardless
        { assignedAt: { lt: hardCapCutoff }, callCount: 0 },
      ],
    },
    select: {
      id: true,
      ownerId: true,
      contactName: true,
      callCount: true,
      lastCallAt: true,
      assignedAt: true,
      reassignmentCount: true,
      escalationLevel: true,
    },
  });

  let reassigned = 0;
  let escalated = 0;

  for (const lead of candidates) {
    const previousOwnerId = lead.ownerId!;
    const newReassignmentCount = lead.reassignmentCount + 1;
    const shouldEscalate =
      newReassignmentCount >= rules.maxReassignmentsBeforeEscalation && lead.callCount === 0;

    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        ownerId: null,
        assignedAt: null,
        claimDeadline: null,
        reassignmentCount: newReassignmentCount,
        escalationLevel: shouldEscalate ? lead.escalationLevel + 1 : lead.escalationLevel,
        lastActivityAt: new Date(),
      },
    });

    const reason =
      lead.callCount === 0
        ? `No call within ${rules.firstCallWithinMinutes}m of assignment`
        : `Last call > ${rules.followUpCallWithinHours}h ago`;
    await recordActivity(lead.id, null, "reassigned", `Auto-released: ${reason}`, {
      previousOwnerId,
      reassignmentCount: newReassignmentCount,
    });

    // Notify the agent who lost the lead
    await notificationsQueue.add(
      `lead-lost-${lead.id}-${previousOwnerId}`,
      {
        userId: previousOwnerId,
        type: "lead_reassigned",
        title: "Lead reassigned",
        body: `${lead.contactName} was taken back: ${reason}`,
        data: { leadId: lead.id },
      },
      { removeOnComplete: true },
    );

    // Reassign — exclude the agent who just lost it so it goes to a fresh person
    await assignLeadRoundRobin(lead.id, [previousOwnerId]);
    reassigned++;

    if (shouldEscalate && rules.notifyOnEscalation) {
      const admins = await prisma.user.findMany({
        where: {
          status: "active",
          OR: [{ accountType: "admin" }, { staffRole: "admin" }],
        },
        select: { id: true },
      });
      for (const admin of admins) {
        await notificationsQueue.add(
          `lead-escalation-${lead.id}-${admin.id}-${newReassignmentCount}`,
          {
            userId: admin.id,
            type: "lead_escalation",
            title: "Lead needs attention",
            body: `${lead.contactName} reassigned ${newReassignmentCount}× without a single call`,
            data: { leadId: lead.id, reassignmentCount: newReassignmentCount },
          },
          { removeOnComplete: true },
        );
      }
      escalated++;
    }
  }

  if (reassigned > 0 || escalated > 0) {
    logger.info({ reassigned, escalated }, "CRM rules sweep tick");
  }
  return { reassigned, escalated };
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

export { FIRST_TOUCH_TTL_MS };
