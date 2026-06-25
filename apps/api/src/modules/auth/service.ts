import crypto from "crypto";

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { prisma } from "../../config/database.js";
import { env } from "../../config/env.js";
import type { AuthPayload } from "../../middleware/auth.js";
import { AppError } from "../../utils/errors.js";
import { logger } from "../../utils/logger.js";
import { emitDomainEvent, notifyAdmins } from "../../utils/notify.js";
import { assignLeadRoundRobin, recordActivity } from "../crm/service.js";

// Push every admin so they know a new customer just joined. Fire-and-forget
// from inside the signup setImmediate block — failure here must not break the
// signup path itself.
async function notifyAdminsOfSignup(customer: {
  id: string;
  name: string | null;
  phone: string;
}): Promise<void> {
  await notifyAdmins(`customer-signup-${customer.id}`, {
    type: "customer_signup",
    title: "New customer signup",
    body: `${customer.name ?? `Customer ${customer.phone.slice(-4)}`} just joined`,
    data: { userId: customer.id, phone: customer.phone },
  });
}

function generateOtp(): string {
  return crypto.randomInt(100000, 999999).toString();
}

// ⚠️ TRIAL BYPASS — REMOVE WHEN FIREBASE PHONE AUTH SHIPS.
// Hardcoded test accounts that skip the OTP DB round-trip and accept the
// fixed code below. Gated by ENABLE_TRIAL_OTP_BYPASS in apps/api/.env.
//
// PROD-SAFE: only the Apple App Review phone is enabled in production. The
// staff/customer dev codes (admin/sales/support/Mohamed) stay dev-only so
// guessable 6-digit codes don't unlock prod admin sessions.
const APPLE_REVIEW_BYPASS: Record<string, string> = {
  "+201234567000": "730284", // Apple App Review demo account
};
// Prod-active demo logins. CUSTOMER-ONLY by construction: verifyOtp() still
// blocks staff/admin on the bypass path (only a real Firebase SMS can mint a
// privileged token), so a guessable code here can never reach a staff account.
// (+201111139358 was retired here once the owner promoted it to an admin
// account — a fixed code must never point at a privileged phone. The Apple
// review demo below is the remaining customer bypass.)
const DEMO_CUSTOMER_BYPASS: Record<string, string> = {};
const DEV_ONLY_TRIAL_BYPASS: Record<string, string> = {
  "+201000000001": "111111", // Admin — Mostafa
  "+201000000010": "222222", // Sales — Amira
  "+201000000011": "333333", // Sales — Youssef
  "+201000000020": "444444", // Support — Layla
  "+201112223344": "555555", // Customer — Mohamed
};
const TRIAL_OTP_BYPASS: Record<string, string> = {
  ...APPLE_REVIEW_BYPASS,
  ...DEMO_CUSTOMER_BYPASS,
  ...(env.NODE_ENV !== "production" ? DEV_ONLY_TRIAL_BYPASS : {}),
};

export function signAccessToken(payload: AuthPayload, expiresIn?: string): string {
  // Stamp a millisecond issue time so session-revocation can order a token
  // against the revocation marker even within the same second (INC-046).
  return jwt.sign({ ...payload, iatMs: Date.now() }, env.JWT_PRIVATE_KEY, {
    algorithm: "RS256",
    expiresIn: (expiresIn ?? env.JWT_ACCESS_EXPIRY) as string,
  } as jwt.SignOptions);
}

function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString("hex");
}

// Refresh-token lifetime. Deliberately long: a returning user should NOT have to
// sign in again unless they've been away a genuinely long time. With continuous
// use the window rolls forward (see refreshAccessToken), so an active user is
// effectively never logged out.
const REFRESH_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days
// Only rotate (revoke + reissue) the refresh token when it's this close to
// expiring. Rotating on EVERY refresh created a race — an app killed mid-refresh
// or two concurrent refreshes left the client holding a just-revoked token,
// which logged the user out for no reason. Keeping the same token valid until it
// nears expiry removes that race entirely.
const REFRESH_ROTATE_WITHIN_MS = 14 * 24 * 60 * 60 * 1000; // last 14 days

export async function sendOtp(phone: string): Promise<{ success: boolean; message: string }> {
  // Trial bypass — these phones accept a fixed hardcoded code, no DB row.
  if (env.ENABLE_TRIAL_OTP_BYPASS && TRIAL_OTP_BYPASS[phone]) {
    logger.info({ phone, msg: "trial-bypass: no OTP row written" });
    return { success: true, message: "OTP sent successfully" };
  }

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Find existing user or create placeholder
  const user = await prisma.user.findUnique({ where: { phone } });

  await prisma.otpCode.create({
    data: {
      phone,
      code: otp,
      expiresAt,
      userId: user?.id,
    },
  });

  // TODO: Send OTP via Twilio WhatsApp/SMS when account is configured
  if (env.NODE_ENV === "development") {
    logger.info({ phone, otp }, "OTP generated (dev mode — not sent via SMS)");
  }

  return { success: true, message: "OTP sent successfully" };
}

export async function verifyOtp(
  phone: string,
  otp: string,
): Promise<{ token: string; refreshToken: string; user: object }> {
  // Trial bypass — accept the hardcoded code for the four pinned test phones.
  const isTrialBypass = env.ENABLE_TRIAL_OTP_BYPASS && TRIAL_OTP_BYPASS[phone] === otp;

  if (!isTrialBypass) {
    const otpRecord = await prisma.otpCode.findFirst({
      where: {
        phone,
        code: otp,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!otpRecord) {
      throw AppError.unauthorized("Invalid or expired OTP");
    }

    // Mark OTP as used
    await prisma.otpCode.update({
      where: { id: otpRecord.id },
      data: { usedAt: new Date() },
    });
  }

  // Find or create user
  let user = await prisma.user.findUnique({ where: { phone } });
  let isNewSignup = false;
  if (user && user.accountType !== "customer" && user.passwordHash) {
    // A privileged account that ALREADY has a password must sign in with it — a
    // single SMS factor must not bypass a set password on staff/admin. A
    // passwordless staff/admin falls through so they can bootstrap a password
    // (then this guard kicks in on the next login).
    throw AppError.forbidden("Please sign in with your password.", "USE_PASSWORD");
  }
  if (user && user.status !== "active") {
    throw AppError.forbidden("Account is not active");
  }
  if (!user) {
    user = await prisma.user.create({
      data: {
        phone,
        accountType: "customer",
        status: "active",
        loyaltyTier: "bronze",
        loyaltyPoints: 0,
      },
    });
    isNewSignup = true;
  }

  // Auto-create + assign lead for new signups (customer-only). FIRED OFF AFTER
  // the response — keeps OTP verification snappy. Acceptable durability for a
  // signup lead: the row can be reconstructed from user.createdAt if the box
  // dies mid-flight.
  if (isNewSignup && user.accountType === "customer") {
    const customer = user;
    setImmediate(() => {
      void (async () => {
        try {
          const lead = await prisma.lead.create({
            data: {
              customerId: customer.id,
              contactName: customer.name || `Customer ${customer.phone.slice(-4)}`,
              contactPhone: customer.phone,
              contactEmail: customer.email,
              source: "signup",
              status: "new",
              estimatedValue: 0,
            },
          });
          await recordActivity(lead.id, null, "created", "Lead auto-created from signup");
          await assignLeadRoundRobin(lead.id);
          emitDomainEvent("customer.signup", customer.id, customer.id, {
            phone: customer.phone,
            leadId: lead.id,
          });
          await notifyAdminsOfSignup({
            id: customer.id,
            name: customer.name,
            phone: customer.phone,
          });
        } catch (err) {
          logger.warn({ err, userId: customer.id }, "Failed to create signup lead (async)");
        }
      })();
    });
  }

  // Generate tokens
  const payload: AuthPayload = { userId: user.id, accountType: user.accountType };
  const accessToken = signAccessToken(payload);
  const refreshToken = generateRefreshToken();

  // Store refresh token (hashed)
  const tokenHash = await bcrypt.hash(refreshToken, 12);
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS), // 30 days
    },
  });

  return {
    token: accessToken,
    refreshToken,
    user: {
      id: user.id,
      phone: user.phone,
      name: user.name,
      email: user.email,
      age: user.age,
      accountType: user.accountType,
      staffRole: user.staffRole,
      hasPassword: !!user.passwordHash,
      loyaltyTier: user.loyaltyTier,
      loyaltyPoints: user.loyaltyPoints,
    },
  };
}

/**
 * Issue a JWT pair for a given phone number. Caller is responsible for having
 * already verified the phone (via OTP, Firebase ID token, etc.). Auto-creates
 * the user + signup lead on first call. Returns the same shape as verifyOtp().
 */
export async function issueTokensForPhone(
  phone: string,
): Promise<{ token: string; refreshToken: string; user: object }> {
  let user = await prisma.user.findUnique({ where: { phone } });
  let isNewSignup = false;
  // Phone OTP is CUSTOMER-ONLY (owner decision 2026-06-20). Staff and admins must
  // sign in with email + password — both for a stronger factor on privileged
  // accounts and so a lost/ported SIM can't take over an admin. This mirrors the
  // same guard in verifyOtp(); the mobile login-method pre-check routes these
  // accounts to the email/password screen before they ever request an OTP.
  if (user && user.accountType !== "customer" && user.passwordHash) {
    // See verifyOtp: a privileged account with a password must use it; a
    // passwordless one may bootstrap via the verified phone, then set a password.
    throw AppError.forbidden("Please sign in with your password.", "USE_PASSWORD");
  }
  if (user && user.status !== "active") {
    throw AppError.forbidden("Account is not active");
  }
  if (!user) {
    user = await prisma.user.create({
      data: {
        phone,
        accountType: "customer",
        status: "active",
        loyaltyTier: "bronze",
        loyaltyPoints: 0,
      },
    });
    isNewSignup = true;
  }

  if (isNewSignup && user.accountType === "customer") {
    const customer = user;
    setImmediate(() => {
      void (async () => {
        try {
          const lead = await prisma.lead.create({
            data: {
              customerId: customer.id,
              contactName: customer.name || `Customer ${customer.phone.slice(-4)}`,
              contactPhone: customer.phone,
              contactEmail: customer.email,
              source: "signup",
              status: "new",
              estimatedValue: 0,
            },
          });
          await recordActivity(lead.id, null, "created", "Lead auto-created from signup");
          await assignLeadRoundRobin(lead.id);
          emitDomainEvent("customer.signup", customer.id, customer.id, {
            phone: customer.phone,
            leadId: lead.id,
          });
          await notifyAdminsOfSignup({
            id: customer.id,
            name: customer.name,
            phone: customer.phone,
          });
        } catch (err) {
          logger.warn({ err, userId: customer.id }, "Failed to create signup lead (async)");
        }
      })();
    });
  }

  const payload: AuthPayload = { userId: user.id, accountType: user.accountType };
  const accessToken = signAccessToken(payload);
  const refreshToken = generateRefreshToken();
  const tokenHash = await bcrypt.hash(refreshToken, 12);
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    },
  });

  return {
    token: accessToken,
    refreshToken,
    user: {
      id: user.id,
      phone: user.phone,
      name: user.name,
      email: user.email,
      age: user.age,
      accountType: user.accountType,
      staffRole: user.staffRole,
      hasPassword: !!user.passwordHash,
      loyaltyTier: user.loyaltyTier,
      loyaltyPoints: user.loyaltyPoints,
    },
  };
}

/**
 * Pre-login routing for the phone screen: tells the app whether this number
 * should sign in with a password (registered account — any staff/admin, or a
 * customer who already set credentials) or go through OTP (new / OTP-only
 * customer). Only reveals "this number uses a password", which the owner
 * explicitly wants so returning users skip OTP. Unknown numbers → OTP (signup).
 */
export async function getLoginMethod(phone: string): Promise<{ method: "password" | "otp" }> {
  const user = await prisma.user.findUnique({
    where: { phone },
    select: { passwordHash: true },
  });
  // Has a password → sign in with it. No password yet (new customer, or a
  // staff/admin who was just created/promoted and never set one) → OTP, which
  // lets them in to set a password. The phone number is the username.
  return { method: user?.passwordHash ? "password" : "otp" };
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<{ token: string; refreshToken: string }> {
  // Find all non-revoked, non-expired refresh tokens
  const tokens = await prisma.refreshToken.findMany({
    where: {
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: { user: true },
  });

  let matchedToken = null;
  for (const t of tokens) {
    if (await bcrypt.compare(refreshToken, t.tokenHash)) {
      matchedToken = t;
      break;
    }
  }

  if (!matchedToken) {
    throw AppError.unauthorized("Invalid refresh token");
  }
  if (matchedToken.user.status !== "active") {
    throw AppError.forbidden("Account is not active");
  }

  const payload: AuthPayload = {
    userId: matchedToken.user.id,
    accountType: matchedToken.user.accountType,
  };

  // Only rotate the refresh token when it's getting close to expiring. Rotating
  // on EVERY refresh used to log active users out: an app killed mid-refresh, or
  // two concurrent refreshes, would leave the client holding a token we'd just
  // revoked → "session expired" out of nowhere. By keeping the SAME refresh
  // token valid until it nears expiry, a normal refresh never invalidates what
  // the client holds, so a returning user stays signed in. Security revokes
  // (logout / password reset / role change) still kill every token immediately.
  const msToExpiry = matchedToken.expiresAt.getTime() - Date.now();
  if (msToExpiry > REFRESH_ROTATE_WITHIN_MS) {
    // Plenty of life left — issue only a fresh access token, keep the refresh.
    return { token: signAccessToken(payload), refreshToken };
  }

  // Near expiry: roll the pair forward so a continuously-active session never
  // hits the wall. Revoke the old, mint a new long-lived one.
  await prisma.refreshToken.update({
    where: { id: matchedToken.id },
    data: { revokedAt: new Date() },
  });

  const newRefreshToken = generateRefreshToken();
  const tokenHash = await bcrypt.hash(newRefreshToken, 12);
  await prisma.refreshToken.create({
    data: {
      userId: matchedToken.user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    },
  });

  return { token: signAccessToken(payload), refreshToken: newRefreshToken };
}

export async function logout(userId: string, pushToken?: string): Promise<void> {
  // Revoke all refresh tokens for this user
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  // Stop push delivery to logged-out sessions. With the device's token we
  // delete just that row; otherwise all of the user's tokens go (shared
  // devices must not keep receiving the previous user's notifications —
  // re-login re-registers via registerPushToken).
  if (pushToken) {
    await prisma.pushToken.deleteMany({ where: { token: pushToken, userId } });
  } else {
    await prisma.pushToken.deleteMany({ where: { userId } });
  }
}

// The login identifier (the `email` request field) is a USERNAME — a phone
// number or an email address. For phones, accept any common shape the user
// might type (local "1001234567", "01001234567", full "+201001234567") by
// expanding to the canonical stored forms.
function phoneVariants(raw: string): string[] {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/[^0-9]/g, "");
  const out = new Set<string>([trimmed]);
  if (!digits) return [...out];
  out.add(`+${digits}`); // "201001234567" → "+201001234567"
  let local = digits;
  if (local.startsWith("20")) local = local.slice(2);
  if (local.startsWith("0")) local = local.slice(1);
  out.add(`+20${local}`); // "1001234567" / "01001234567" → "+201001234567"
  return [...out];
}

export async function loginWithPassword(
  identifier: string,
  password: string,
): Promise<{ token: string; refreshToken: string; user: object }> {
  // Match the identifier against USERNAME, PHONE, or EMAIL. Username is stored
  // lowercased; email match is case-insensitive (addresses were historically
  // stored as typed, e.g. "SHADY@GMAIL.COM").
  const id = identifier.trim();
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { username: id.toLowerCase() },
        { phone: { in: phoneVariants(id) } },
        { email: { equals: id, mode: "insensitive" } },
      ],
    },
  });
  // Distinct, honest failures so a user knows what to do next. The owner wants
  // clarity over email-enumeration hardening for this app; the auth rate
  // limiter on /api/auth/login already bounds guessing/scraping abuse.
  if (!user) {
    throw AppError.unauthorized("No account found with that phone number or email.", "NO_ACCOUNT");
  }
  if (!user.passwordHash) {
    throw AppError.unauthorized(
      "This account doesn't have a password yet. Sign in with your phone number, or ask an admin to set one for you.",
      "NO_PASSWORD_SET",
    );
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    throw AppError.unauthorized("Incorrect password. Please try again.", "WRONG_PASSWORD");
  }
  if (user.status !== "active") {
    throw AppError.forbidden(
      "This account isn't active. Please contact an admin.",
      "ACCOUNT_INACTIVE",
    );
  }

  const payload: AuthPayload = { userId: user.id, accountType: user.accountType };
  const accessToken = signAccessToken(payload);
  const refreshToken = generateRefreshToken();
  const tokenHash = await bcrypt.hash(refreshToken, 12);
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    },
  });

  return {
    token: accessToken,
    refreshToken,
    user: {
      id: user.id,
      phone: user.phone,
      name: user.name,
      email: user.email,
      age: user.age,
      accountType: user.accountType,
      staffRole: user.staffRole,
      hasPassword: !!user.passwordHash,
      loyaltyTier: user.loyaltyTier,
      loyaltyPoints: user.loyaltyPoints,
    },
  };
}

/**
 * Set the caller's name + email + password after first-time phone verification
 * (or from the profile screen). Email becomes a login identifier so it must be
 * unique. Afterwards the user can sign in with email + password instead of OTP.
 */
export async function setCredentials(
  userId: string,
  input: { name: string; email?: string; username?: string; password: string; age?: number },
): Promise<{ user: object }> {
  // Email + username are OPTIONAL login identifiers (the phone number is the
  // account key). Only touch a column when a non-empty value is supplied, so we
  // never wipe an existing one or trip a uniqueness check on an empty string.
  const normalizedEmail = input.email?.trim().toLowerCase() || null;
  if (normalizedEmail) {
    const existing = await prisma.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: "insensitive" } },
    });
    if (existing && existing.id !== userId) {
      throw AppError.badRequest("That email is already in use");
    }
  }
  const normalizedUsername = input.username?.trim().toLowerCase() || null;
  if (normalizedUsername) {
    const taken = await prisma.user.findFirst({ where: { username: normalizedUsername } });
    if (taken && taken.id !== userId) {
      throw AppError.badRequest("That username is already taken");
    }
  }
  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      name: input.name,
      ...(normalizedEmail ? { email: normalizedEmail } : {}),
      ...(normalizedUsername ? { username: normalizedUsername } : {}),
      passwordHash,
      ...(input.age !== undefined ? { age: input.age } : {}),
    },
  });
  return {
    user: {
      id: user.id,
      phone: user.phone,
      name: user.name,
      email: user.email,
      username: user.username,
      age: user.age,
      accountType: user.accountType,
      staffRole: user.staffRole,
      hasPassword: true,
      loyaltyTier: user.loyaltyTier,
      loyaltyPoints: user.loyaltyPoints,
    },
  };
}

/**
 * Admin "act as": mint a short-lived token that assumes a customer or staff
 * role so the admin can preview that experience under the role's REAL
 * permissions (authorize() enforces it via the assumed accountType). The
 * token keeps the admin's own userId (data ownership) and carries `actingAs`
 * so mutations are audited back to the real admin and CRM scoping treats the
 * session as non-admin. No refresh token is issued — it's ephemeral; exiting
 * restores the admin token the client kept. Caller MUST already be admin-gated.
 */
export async function assumeRole(
  adminId: string,
  role: "customer" | "staff",
  staffRole?: "sales" | "support" | "inventory" | "mechanic",
): Promise<{ token: string; user: object }> {
  const admin = await prisma.user.findUnique({ where: { id: adminId } });
  if (!admin || admin.accountType !== "admin") {
    throw AppError.forbidden("Only an admin can switch roles");
  }
  const assumedStaffRole = role === "staff" ? (staffRole ?? null) : null;
  const payload: AuthPayload = {
    userId: adminId,
    accountType: role,
    staffRole: assumedStaffRole,
    actingAs: adminId,
  };
  const token = signAccessToken(payload, "2h");
  return {
    token,
    user: {
      id: admin.id,
      phone: admin.phone,
      name: admin.name,
      email: admin.email,
      age: admin.age,
      accountType: role,
      staffRole: assumedStaffRole,
      hasPassword: !!admin.passwordHash,
      loyaltyTier: admin.loyaltyTier,
      loyaltyPoints: admin.loyaltyPoints,
      actingAsAdminId: adminId,
    },
  };
}
