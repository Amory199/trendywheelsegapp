import { prisma } from "../../config/database.js";
import { logger } from "../../utils/logger.js";
import { notifyAdmins, notifyUser } from "../../utils/notify.js";

import {
  emitLeadActivity,
  emitLeadAssigned,
  emitLeadInactive,
  emitLeadRotated,
} from "./realtime.js";

export interface CrmRules {
  firstCallWithinMinutes: number;
  followUpCallWithinHours: number;
  reassignAfterHours: number;
  maxReassignmentsBeforeEscalation: number;
  maxCallsBeforeReassign: number;
  requireMessageAfterCall: boolean;
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
    maxCallsBeforeReassign: row.maxCallsBeforeReassign,
    requireMessageAfterCall: row.requireMessageAfterCall,
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

  // Call placed (any variant) bumps callCount + lastCallAt. We treat both the
  // legacy "call" type and the new "call_attempted" as call records — the mobile
  // app emits the attempt event the moment the dial intent fires, before the
  // outcome (answered/no-answer) is known, so the counter is incremented once
  // per dial regardless of outcome.
  if (type === "call" || type === "call_attempted") {
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        lastCallAt: new Date(),
        lastActivityAt: new Date(),
        callCount: { increment: 1 },
      },
    });
  } else if (type === "whatsapp_sent") {
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        lastMessageAt: new Date(),
        lastActivityAt: new Date(),
        messageCount: { increment: 1 },
      },
    });
  } else {
    await prisma.lead.update({
      where: { id: leadId },
      data: { lastActivityAt: new Date() },
    });
  }

  // Real-time push to admin so its pipeline / activity feeds refresh without
  // a manual pull. Fire-and-forget; failure here mustn't block the activity.
  emitLeadActivity(leadId, actorId, type);
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
      // Staff accounts can have staffRole=null transitionally (e.g. mid-edit).
      // Gating on accountType first guarantees we never silently skip a sales
      // agent because their role hasn't been written yet.
      accountType: { in: ["admin", "staff"] },
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
    await notifyUser(chosen.id, `lead-assigned-${leadId}`, {
      type: "lead_assigned",
      title: "New lead",
      body: `${lead.contactName} (${lead.source}) — call within ${rules.firstCallWithinMinutes} min`,
      data: { leadId, contactName: lead.contactName, source: lead.source },
    });
  }

  emitLeadAssigned(leadId, null, chosen.id);
  logger.info({ leadId, agentId: chosen.id }, "Lead assigned via round-robin");
  return chosen.id;
}

// Up to this many distinct agents may try the same lead before it is parked
// in the admin-only "inactive" pool. Matches the user's "about 5 different
// sales agents" direction (round-3).
export const ROTATION_LIMIT = 5;

/**
 * Rotate a lead to the next agent the round-robin would pick, excluding every
 * agent that has already tried it (derived from the activity log). When
 * ROTATION_LIMIT distinct agents have been tried, the lead is parked with
 * `status = inactive` and `ownerId = null` — visible only to admins.
 *
 * triggeredBy is the actorId logged on the activity row (null for the sweep).
 */
export async function rotateLeadToNextAgent(
  leadId: string,
  triggeredBy: string | null,
): Promise<{ status: "rotated" | "inactive"; nextOwnerId?: string; triedCount: number }> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw new Error("lead missing");

  // Build the exclude set from history: every agent ever recorded as `assigned`
  // or `rotated`. Falls back to `ownerId` as a safety net.
  const history = await prisma.leadActivity.findMany({
    where: { leadId, type: { in: ["assigned", "rotated", "reassigned"] } },
    select: { metadata: true, actorId: true },
  });
  const tried = new Set<string>();
  if (lead.ownerId) tried.add(lead.ownerId);
  for (const h of history) {
    const m = (h.metadata as { ownerId?: string; previousOwnerId?: string } | null) ?? null;
    if (m?.ownerId) tried.add(m.ownerId);
    if (m?.previousOwnerId) tried.add(m.previousOwnerId);
  }

  if (tried.size >= ROTATION_LIMIT) {
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: "inactive",
        ownerId: null,
        assignedAt: null,
        claimDeadline: null,
        lastActivityAt: new Date(),
      },
    });
    await recordActivity(
      leadId,
      triggeredBy,
      "marked_inactive",
      `Lead exhausted rotation after ${tried.size} agents`,
      { triedCount: tried.size },
    );
    emitLeadInactive(leadId, triggeredBy);
    logger.info({ leadId, triedCount: tried.size }, "Lead moved to inactive pool");
    return { status: "inactive", triedCount: tried.size };
  }

  const next = await assignLeadRoundRobin(leadId, Array.from(tried));
  if (!next) {
    // No untried agent available — park inactive so the lead doesn't loop.
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: "inactive",
        ownerId: null,
        assignedAt: null,
        claimDeadline: null,
        lastActivityAt: new Date(),
      },
    });
    await recordActivity(
      leadId,
      triggeredBy,
      "marked_inactive",
      `No fresh agent available after ${tried.size} tried`,
      { triedCount: tried.size },
    );
    emitLeadInactive(leadId, triggeredBy);
    return { status: "inactive", triedCount: tried.size };
  }

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      reassignmentCount: { increment: 1 },
      // Reset cadence quota for the new owner so they get a clean shot.
      callCount: 0,
      messageCount: 0,
      lastCallAt: null,
      lastMessageAt: null,
      escalationLevel: 0,
    },
  });
  await recordActivity(leadId, triggeredBy, "rotated", "Rotated to next agent", {
    ownerId: next,
    previousOwnerId: lead.ownerId ?? undefined,
  });
  emitLeadRotated(leadId, triggeredBy, next, lead.ownerId);
  return { status: "rotated", nextOwnerId: next, triedCount: tried.size + 1 };
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
        // Rule 0: call cap reached — 4 calls + 4 messages with no movement out of an open
        // pipeline stage means the customer isn't engaging this agent; rotate to a fresh one.
        {
          callCount: { gte: rules.maxCallsBeforeReassign },
          messageCount: { gte: rules.maxCallsBeforeReassign },
        },
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
      messageCount: true,
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
    const reason =
      lead.callCount >= rules.maxCallsBeforeReassign
        ? `${lead.callCount} calls + ${lead.messageCount} messages, no engagement`
        : lead.callCount === 0
          ? `No call within ${rules.firstCallWithinMinutes}m of assignment`
          : `Last call > ${rules.followUpCallWithinHours}h ago`;

    // Rotate via the shared helper so the "5 distinct agents → inactive pool"
    // rule applies to sweep-driven reassignments too, not just manual ones.
    const result = await rotateLeadToNextAgent(lead.id, null);

    // Notify the agent who lost the lead
    await notifyUser(previousOwnerId, `lead-lost-${lead.id}`, {
      type: "lead_reassigned",
      title: "Lead reassigned",
      body: `${lead.contactName} was taken back: ${reason}`,
      data: { leadId: lead.id },
    });

    if (result.status === "rotated") {
      reassigned++;
    } else {
      // Parked inactive — surface to admin queue.
      escalated++;
      if (rules.notifyOnEscalation) {
        await notifyAdmins(`lead-inactive-${lead.id}`, {
          type: "lead_inactive",
          title: "Lead parked inactive",
          body: `${lead.contactName} exhausted rotation after ${result.triedCount} agents`,
          data: { leadId: lead.id, triedCount: result.triedCount },
        });
      }
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
