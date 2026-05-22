// Shared auth/role predicates and ownership guards. Replaces the
// ad-hoc `accountType === "admin" || staffRole === "admin"` checks that
// were copy-pasted across 12+ handlers, plus the customer-owns-record
// guards that were duplicated across 12 more.
//
// Behavior is preserved per-site: callers that previously threw
// AppError.forbidden() still throw forbidden; callers that threw
// AppError.notFound() can still pass a custom factory. None of these
// helpers change response codes or messages — they just collapse the
// predicate.

import type { Prisma } from "@prisma/client";
import type { Request } from "express";

import { AppError } from "./errors.js";

// Shape that covers both the JWT payload (`req.user`) and the Prisma User
// row. The payload only knows accountType; the row has both fields. Optional
// chaining handles either case.
interface UserLike {
  accountType?: string | null;
  staffRole?: string | null;
}

/**
 * True if the user is an admin — either by accountType (legacy "admin"
 * account) or by staffRole (post-AJ explicit admin role). Works for both
 * the JWT payload (req.user) and a Prisma User row.
 */
export function isAdmin(user: UserLike | null | undefined): boolean {
  if (!user) return false;
  return user.accountType === "admin" || user.staffRole === "admin";
}

export function isCustomer(user: UserLike | null | undefined): boolean {
  return user?.accountType === "customer";
}

/**
 * Prisma `where` clause matching admin users (account-admin OR staff-admin).
 * Spread into a larger filter, e.g. `where: { status: "active", ...ADMIN_FILTER }`.
 */
export const ADMIN_FILTER: Prisma.UserWhereInput = {
  OR: [{ accountType: "admin" }, { staffRole: "admin" }],
};

/**
 * Throws if the authed user is a customer trying to act on a record owned
 * by someone else. Admins and staff pass unconditionally. Pass an error
 * factory to keep site-specific status codes / messages (e.g. some CRM
 * handlers prefer notFound to avoid leaking lead existence).
 *
 * Usage:
 *   requireOwner(req, listing.userId);                  // throws 403
 *   requireOwner(req, lead.ownerId, () =>               // throws 404 instead
 *     AppError.notFound("Lead no longer in your pipeline"));
 */
export function requireOwner(
  req: Request,
  ownerId: string,
  errorFactory: () => AppError = () => AppError.forbidden(),
): void {
  if (req.user!.accountType === "customer" && ownerId !== req.user!.userId) {
    throw errorFactory();
  }
}

/**
 * Mutates a Prisma `where` clause to scope list queries to the customer's
 * own records. No-op for admins/staff so they see everything.
 *
 * Usage:
 *   const where: Record<string, unknown> = {};
 *   scopeListToOwner(req, where);
 *   const rows = await prisma.repair.findMany({ where });
 */
export function scopeListToOwner(req: Request, where: Record<string, unknown>): void {
  if (req.user!.accountType === "customer") {
    where.userId = req.user!.userId;
  }
}
