import type { Request, Response } from "express";

import { Prisma } from "@prisma/client";
import {
  createStaffSchema,
  requestAccountDeletionSchema,
  updateUserSchema,
} from "@trendywheels/validators";
import bcrypt from "bcryptjs";

import { PAGINATION } from "../../config/limits.js";
import { prisma } from "../../config/database.js";
import { requireOwner } from "../../utils/auth-roles.js";
import { AppError } from "../../utils/errors.js";

export async function list(req: Request, res: Response): Promise<void> {
  const { page = "1", limit = "20" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(PAGINATION.max, Math.max(1, Number(limit)));

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      select: {
        id: true,
        phone: true,
        email: true,
        name: true,
        avatarUrl: true,
        accountType: true,
        status: true,
        loyaltyTier: true,
        loyaltyPoints: true,
        createdAt: true,
      },
    }),
    prisma.user.count(),
  ]);
  res.json({ data: users, total, page: pageNum, limit: limitNum });
}

export async function getMe(req: Request, res: Response): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: {
      id: true,
      phone: true,
      email: true,
      name: true,
      age: true,
      avatarUrl: true,
      accountType: true,
      staffRole: true,
      status: true,
      preferences: true,
      loyaltyTier: true,
      loyaltyPoints: true,
      createdAt: true,
    },
  });
  if (!user) throw AppError.notFound("User not found");
  res.json({ data: user });
}

export async function getById(req: Request, res: Response): Promise<void> {
  // Customers can only view their own profile
  requireOwner(req, req.params.id);

  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      phone: true,
      email: true,
      name: true,
      age: true,
      avatarUrl: true,
      accountType: true,
      staffRole: true,
      status: true,
      preferences: true,
      loyaltyTier: true,
      loyaltyPoints: true,
      createdAt: true,
    },
  });
  if (!user) throw AppError.notFound("User not found");
  res.json({ data: user });
}

export async function update(req: Request, res: Response): Promise<void> {
  // Customers can only update their own profile
  requireOwner(req, req.params.id);

  const parsed = updateUserSchema.parse(req.body);
  // Privilege fields are admin-only — strip silently for any non-admin caller
  // so customers/staff cannot self-promote, unsuspend, or change role.
  const isAdmin = req.user!.accountType === "admin";
  const baseData = isAdmin
    ? parsed
    : (() => {
        const { accountType: _at, staffRole: _sr, status: _st, ...rest } = parsed;
        return rest;
      })();

  // Prisma's nullable JSON columns reject raw `null` — they need the explicit
  // `Prisma.DbNull` sentinel. Mobile sends preferences:null when the user
  // hasn't touched the prefs editor yet; translate it here so the PUT doesn't
  // crash with a Zod-passes-Prisma-rejects error.
  const { preferences, ...rest } = baseData;
  const data: Record<string, unknown> = { ...rest };
  if (preferences !== undefined) {
    data.preferences = preferences === null ? Prisma.DbNull : preferences;
  }

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data,
    select: {
      id: true,
      phone: true,
      email: true,
      name: true,
      avatarUrl: true,
      accountType: true,
      preferences: true,
      loyaltyTier: true,
      loyaltyPoints: true,
    },
  });
  res.json({ data: user });
}

export async function exportData(req: Request, res: Response): Promise<void> {
  // Users can only export their own data; admins can export any
  requireOwner(req, req.params.id);

  const userId = req.params.id;
  const [user, bookings, repairs, tickets, listings, messages] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.booking.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.repairRequest.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.supportTicket.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.salesListing.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.message.findMany({ where: { senderId: userId }, orderBy: { createdAt: "desc" } }),
  ]);

  if (!user) throw AppError.notFound("User not found");

  res.json({
    exported_at: new Date().toISOString(),
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      accountType: user.accountType,
      loyaltyTier: user.loyaltyTier,
      loyaltyPoints: user.loyaltyPoints,
      createdAt: user.createdAt,
    },
    bookings,
    repairs,
    tickets,
    listings,
    messages,
  });
}

// Public endpoint backing the /account/delete form (Google Play Store requires
// a self-service deletion path accessible without app login). Creates a
// DeletionRequest the ops team processes within 30 days, in line with our
// privacy policy.
export async function requestDeletion(req: Request, res: Response): Promise<void> {
  const { email, phone, reason } = requestAccountDeletionSchema.parse(req.body);

  // Best-effort link to an existing user (by email or phone) but the request is
  // still recorded even if no match — ops verifies offline.
  const user = await prisma.user.findFirst({
    where: { OR: [{ email }, { phone }] },
    select: { id: true },
  });

  await prisma.deletionRequest.create({
    data: { email, phone, reason, userId: user?.id ?? null },
  });

  res.status(202).json({
    message:
      "Deletion request received. We'll process it within 30 days and email you when complete.",
  });
}

export async function deleteAccount(req: Request, res: Response): Promise<void> {
  // Only admins can delete any account; customers can delete their own
  requireOwner(req, req.params.id);

  const userId = req.params.id;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw AppError.notFound("User not found");

  // Soft delete: anonymize PII fields, set status to INACTIVE
  await prisma.user.update({
    where: { id: userId },
    data: {
      name: "Deleted User",
      email: null,
      phone: `deleted_${userId}`,
      avatarUrl: null,
      status: "inactive",
    },
  });

  res.json({ message: "Account deleted and personal data anonymized" });
}

export async function disable(req: Request, res: Response): Promise<void> {
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { status: "suspended" },
    select: { id: true, status: true },
  });
  // Revoke active refresh tokens so the user is logged out everywhere.
  await prisma.refreshToken.updateMany({
    where: { userId: req.params.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  res.json({ data: user });
}

export async function enable(req: Request, res: Response): Promise<void> {
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { status: "active" },
    select: { id: true, status: true },
  });
  res.json({ data: user });
}

export async function createStaff(req: Request, res: Response): Promise<void> {
  const input = createStaffSchema.parse(req.body);
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: input.email }, { phone: input.phone }] },
    select: { id: true, email: true, phone: true },
  });
  if (existing) {
    throw AppError.conflict(
      existing.email === input.email ? "Email already in use" : "Phone already in use",
      "USER_EXISTS",
    );
  }
  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone,
      passwordHash,
      accountType: input.staffRole === "admin" ? "admin" : "staff",
      staffRole: input.staffRole,
      status: "active",
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      accountType: true,
      staffRole: true,
      status: true,
      createdAt: true,
    },
  });
  res.status(201).json({ data: user });
}

export async function getInteractions(req: Request, res: Response): Promise<void> {
  requireOwner(req, req.params.id);

  const userId = req.params.id;
  const { page = "1", limit = "20" } = req.query as Record<string, string>;
  const pageNum = Number(page);
  const limitNum = Number(limit);

  const [bookings, repairs, tickets] = await Promise.all([
    prisma.booking.findMany({
      where: { userId },
      take: limitNum,
      skip: (pageNum - 1) * limitNum,
      orderBy: { createdAt: "desc" },
    }),
    prisma.repairRequest.findMany({
      where: { userId },
      take: limitNum,
      skip: (pageNum - 1) * limitNum,
      orderBy: { createdAt: "desc" },
    }),
    prisma.supportTicket.findMany({
      where: { userId },
      take: limitNum,
      skip: (pageNum - 1) * limitNum,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  res.json({
    data: {
      bookings,
      repairs,
      tickets,
    },
  });
}

// Per-customer activity timeline. Returns a unified, chronologically-sorted
// list of every entity the customer has touched: bookings, repairs, sales
// listings, maintenance, customization, pickup-delivery, sign-up. Admin/staff
// only — the auth gate is in routes.ts.
export async function getTimeline(req: Request, res: Response): Promise<void> {
  const userId = req.params.id;

  // Fetch in parallel — each query is small (per-user). Keep limits per
  // category so a power-user account can't blow up the response.
  const [user, bookings, repairs, listings, maintenance, customization, transport, leadActivities] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, phone: true, email: true, createdAt: true },
      }),
      prisma.booking.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { vehicle: { select: { name: true } } },
      }),
      prisma.repairRequest.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.salesListing.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.maintenanceRequest.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.customizationRequest.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.transportRequest.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      // Lead activities — find the lead bound to this customer, then pull its
      // activities (calls, WhatsApp, notes, status changes, rotations…).
      prisma.leadActivity.findMany({
        where: { lead: { customerId: userId } },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    ]);

  if (!user) throw AppError.notFound("User not found");

  interface TimelineRow {
    at: string;
    kind:
      | "signup"
      | "booking"
      | "repair"
      | "sales-listing"
      | "maintenance"
      | "customization"
      | "pickup"
      | "lead-activity";
    entityId: string;
    summary: string;
    meta?: Record<string, unknown>;
  }

  const rows: TimelineRow[] = [];
  rows.push({
    at: user.createdAt.toISOString(),
    kind: "signup",
    entityId: user.id,
    summary: `Account created${user.name ? ` — ${user.name}` : ""}`,
  });
  for (const b of bookings) {
    rows.push({
      at: b.createdAt.toISOString(),
      kind: "booking",
      entityId: b.id,
      summary: `Booked ${b.vehicle?.name ?? "vehicle"} (${b.status})`,
      meta: { status: b.status, totalCost: Number(b.totalCost) },
    });
  }
  for (const r of repairs) {
    rows.push({
      at: r.createdAt.toISOString(),
      kind: "repair",
      entityId: r.id,
      summary: `Repair request — ${r.category} (${r.status})`,
      meta: { status: r.status, priority: r.priority },
    });
  }
  for (const l of listings) {
    rows.push({
      at: l.createdAt.toISOString(),
      kind: "sales-listing",
      entityId: l.id,
      summary: `Listed for sale — ${l.title ?? "untitled"} (${l.status})`,
      meta: { status: l.status, price: Number(l.price) },
    });
  }
  for (const m of maintenance) {
    rows.push({
      at: m.createdAt.toISOString(),
      kind: "maintenance",
      entityId: m.id,
      summary: `Maintenance request — ${m.serviceType}`,
      meta: { status: m.status },
    });
  }
  for (const c of customization) {
    rows.push({
      at: c.createdAt.toISOString(),
      kind: "customization",
      entityId: c.id,
      summary: `Customization request — ${c.kind}`,
      meta: { status: c.status },
    });
  }
  for (const t of transport) {
    rows.push({
      at: t.createdAt.toISOString(),
      kind: "pickup",
      entityId: t.id,
      summary: `Pickup/delivery — ${t.fromAddress.slice(0, 30)} → ${t.toAddress.slice(0, 30)}`,
      meta: { status: t.status },
    });
  }
  for (const a of leadActivities) {
    rows.push({
      at: a.createdAt.toISOString(),
      kind: "lead-activity",
      entityId: a.id,
      summary: a.body,
      meta: { type: a.type, leadId: a.leadId },
    });
  }

  rows.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));

  res.json({
    data: {
      user: { id: user.id, name: user.name, phone: user.phone, email: user.email },
      rows,
    },
  });
}
