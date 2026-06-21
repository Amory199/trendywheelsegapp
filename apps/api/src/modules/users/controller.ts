import type { Request, Response } from "express";

import { Prisma } from "@prisma/client";
import {
  createStaffSchema,
  requestAccountDeletionSchema,
  updateUserPreferencesSchema,
  updateUserSchema,
  userPreferencesSchema,
} from "@trendywheels/validators";
import bcrypt from "bcryptjs";

import { PAGINATION } from "../../config/limits.js";
import { prisma } from "../../config/database.js";
import { requireOwner } from "../../utils/auth-roles.js";
import { AppError } from "../../utils/errors.js";
import { revokeUserSessions } from "../auth/session-revocation.js";

import { buildCustomerTimeline, mergePreferences } from "./service.js";

export async function list(req: Request, res: Response): Promise<void> {
  const { page = "1", limit = "20" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(PAGINATION.max, Math.max(1, Number(limit)));

  // Hide soft-deleted accounts: deleteAccount() anonymizes the row and rewrites
  // the phone to `deleted_<id>`. That prefix is the deletion marker, so the
  // admin users list never shows ghost "Deleted User" rows.
  const where: Prisma.UserWhereInput = { NOT: { phone: { startsWith: "deleted_" } } };

  // RBAC: only an ADMIN may browse the whole user base. Non-admin staff hit
  // this endpoint solely to pick a teammate (e.g. the support assign-agent
  // picker), so they only ever see staff/admin rows — never the customer list.
  if (req.user!.accountType !== "admin") {
    where.accountType = { in: ["admin", "staff"] };
  }
  // Optional staffRole filter (assign-agent picker passes ?staffRole=support).
  const { staffRole } = req.query as Record<string, string>;
  const STAFF_ROLES = ["sales", "support", "inventory", "mechanic", "admin"];
  if (staffRole && STAFF_ROLES.includes(staffRole)) {
    where.staffRole = staffRole as Prisma.UserWhereInput["staffRole"];
  }
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
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
    prisma.user.count({ where }),
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
      username: true,
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
      // Mapped to a boolean below — never expose the hash itself.
      passwordHash: true,
    },
  });
  if (!user) throw AppError.notFound("User not found");
  const { passwordHash, ...safe } = user;
  // When this is an admin "act as" token, present the ASSUMED role (from the
  // token) instead of the admin's real DB identity, so the app stays in the
  // previewed role across reloads. The real admin is in req.user.actingAs.
  const acting = req.user!.actingAs;
  res.json({
    data: {
      ...safe,
      hasPassword: !!passwordHash,
      ...(acting
        ? {
            accountType: req.user!.accountType,
            staffRole: req.user!.staffRole ?? null,
            actingAsAdminId: acting,
          }
        : {}),
    },
  });
}

// PATCH /api/users/me/preferences
// Deep-merges the patch into existing user.preferences. The merged result is
// re-validated against userPreferencesSchema before save — so a malformed
// existing JSON column gets normalized on first write, and unknown keys are
// silently dropped instead of accumulating drift.
export async function updateMyPreferences(req: Request, res: Response): Promise<void> {
  const patch = updateUserPreferencesSchema.parse(req.body);

  const current = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { preferences: true },
  });
  if (!current) throw AppError.notFound("User not found");

  const merged = mergePreferences(current.preferences, patch);
  const normalized = userPreferencesSchema.parse(merged);

  const updated = await prisma.user.update({
    where: { id: req.user!.userId },
    data: { preferences: normalized as unknown as Prisma.InputJsonValue },
    select: { preferences: true },
  });

  res.json({ data: updated.preferences });
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
  // Keep emails lowercased so the case-insensitive login lookup stays canonical.
  if (typeof data.email === "string") data.email = data.email.trim().toLowerCase();

  // A customer must never retain a staff role. Demoting accountType -> customer
  // without clearing staffRole left a stray role on the row; since some checks
  // (isAdmin) and UI lists key off staffRole, the "customer" was still treated
  // as staff. Force it null so the demotion fully takes effect (and the
  // privilege-diff below revokes their session, dropping any staff access).
  if (data.accountType === "customer") {
    data.staffRole = null;
  }

  // An admin changing accountType/staffRole/status must force the affected user
  // to re-authenticate — otherwise their existing token keeps the old role for
  // up to JWT_ACCESS_EXPIRY (INC-013). Snapshot the privilege fields first so we
  // only revoke when something actually changed (a name/email edit shouldn't
  // log anyone out).
  const privilegeKeys = ["accountType", "staffRole", "status"] as const;
  const touchesPrivilege = isAdmin && privilegeKeys.some((k) => data[k] !== undefined);
  const before = touchesPrivilege
    ? await prisma.user.findUnique({
        where: { id: req.params.id },
        select: { accountType: true, staffRole: true, status: true },
      })
    : null;

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

  if (before) {
    const changed = privilegeKeys.some((k) => data[k] !== undefined && data[k] !== before[k]);
    if (changed) await revokeUserSessions(req.params.id);
  }

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

  // Kill live sessions + push delivery — the soft-deleted row keeps audit
  // history, but the device must not stay signed in or keep getting pushes.
  await revokeUserSessions(userId);
  await prisma.pushToken.deleteMany({ where: { userId } });

  res.json({ message: "Account deleted and personal data anonymized" });
}

// Admin sets/resets a user's login password. Forces re-auth everywhere so the
// old password (and any live session) stops working immediately. Admin-gated in
// routes.ts. Useful for onboarding staff/admins (who sign in by email+password)
// and for helping a customer who's locked out.
export async function setPassword(req: Request, res: Response): Promise<void> {
  const { password } = req.body as { password: string };
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: { id: true },
  });
  if (!user) throw AppError.notFound("User not found");

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.update({ where: { id: req.params.id }, data: { passwordHash } });
  await revokeUserSessions(req.params.id);

  res.json({ success: true });
}

export async function disable(req: Request, res: Response): Promise<void> {
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { status: "suspended" },
    select: { id: true, status: true },
  });
  // Revoke refresh AND access tokens so the user is logged out everywhere
  // immediately — not just until their access token expires (INC-013).
  await revokeUserSessions(req.params.id);
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
  // Store emails + usernames lowercased so login (case-insensitive) always matches.
  const email = input.email ? input.email.trim().toLowerCase() : undefined;
  const username = input.username ? input.username.trim().toLowerCase() : undefined;
  const conflictFilters: Prisma.UserWhereInput[] = [{ phone: input.phone }];
  if (email) conflictFilters.push({ email: { equals: email, mode: "insensitive" } });
  if (username) conflictFilters.push({ username });
  const existing = await prisma.user.findFirst({
    where: { OR: conflictFilters },
    select: { id: true, email: true, phone: true, username: true },
  });
  if (existing) {
    throw AppError.conflict(
      email && existing.email?.toLowerCase() === email
        ? "Email already in use"
        : username && existing.username === username
          ? "Username already taken"
          : "Phone already in use",
      "USER_EXISTS",
    );
  }
  // Non-admin staff log in via phone+OTP, so a password hash isn't needed.
  // Admin web login still uses email+password — schema enforces both present
  // when staffRole === "admin".
  const passwordHash = input.password ? await bcrypt.hash(input.password, 12) : null;
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: email ?? null,
      username: username ?? null,
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
// list of every entity the customer has touched. Admin/staff only — the auth
// gate is in routes.ts.
export async function getTimeline(req: Request, res: Response): Promise<void> {
  const data = await buildCustomerTimeline(req.params.id);
  res.json({ data });
}
