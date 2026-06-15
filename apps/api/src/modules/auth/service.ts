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
const DEV_ONLY_TRIAL_BYPASS: Record<string, string> = {
  "+201000000001": "111111", // Admin — Mostafa
  "+201000000010": "222222", // Sales — Amira
  "+201000000011": "333333", // Sales — Youssef
  "+201000000020": "444444", // Support — Layla
  "+201112223344": "555555", // Customer — Mohamed
};
const TRIAL_OTP_BYPASS: Record<string, string> = {
  ...APPLE_REVIEW_BYPASS,
  ...(env.NODE_ENV !== "production" ? DEV_ONLY_TRIAL_BYPASS : {}),
};

export function signAccessToken(payload: AuthPayload, expiresIn?: string): string {
  return jwt.sign(payload, env.JWT_PRIVATE_KEY, {
    algorithm: "RS256",
    expiresIn: (expiresIn ?? env.JWT_ACCESS_EXPIRY) as string,
  } as jwt.SignOptions);
}

function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString("hex");
}

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
  if (user && user.accountType !== "customer") {
    // Phone-OTP is customer-only. Staff and admins must use email + password.
    throw AppError.forbidden("Staff and admins must sign in with email and password.");
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
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
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
function isStaffTestPhone(phone: string): boolean {
  if (!env.STAFF_TEST_PHONES) return false;
  return env.STAFF_TEST_PHONES.split(",")
    .map((p) => p.trim())
    .includes(phone);
}

export async function issueTokensForPhone(
  phone: string,
): Promise<{ token: string; refreshToken: string; user: object }> {
  let user = await prisma.user.findUnique({ where: { phone } });
  let isNewSignup = false;
  // Customer-only by default (vuln 1 fix). Narrow exception: phones in the
  // STAFF_TEST_PHONES allow-list AND already seeded with a staffRole can
  // authenticate as staff for dev/test. Both conditions must hold.
  if (user && user.accountType !== "customer") {
    const isAllowedStaffTest = isStaffTestPhone(phone) && user.staffRole !== null;
    if (!isAllowedStaffTest) {
      throw AppError.forbidden("Staff and admins must sign in with email and password.");
    }
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
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
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
      loyaltyTier: user.loyaltyTier,
      loyaltyPoints: user.loyaltyPoints,
    },
  };
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

  // Rotate the WHOLE pair: revoke the presented refresh token AND mint a fresh
  // one. Previously we revoked the old token but returned only a new access
  // token — so the next refresh (after the access token's 24h life) found the
  // refresh token already revoked and logged the user out. Returning a new
  // refresh token here lets a session survive its full 30-day window.
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
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
  });

  const payload: AuthPayload = {
    userId: matchedToken.user.id,
    accountType: matchedToken.user.accountType,
  };

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

export async function loginWithPassword(
  email: string,
  password: string,
): Promise<{ token: string; refreshToken: string; user: object }> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) {
    throw AppError.unauthorized("Invalid credentials");
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw AppError.unauthorized("Invalid credentials");
  if (user.status !== "active") throw AppError.forbidden("Account is not active");

  const payload: AuthPayload = { userId: user.id, accountType: user.accountType };
  const accessToken = signAccessToken(payload);
  const refreshToken = generateRefreshToken();
  const tokenHash = await bcrypt.hash(refreshToken, 12);
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
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
      loyaltyTier: user.loyaltyTier,
      loyaltyPoints: user.loyaltyPoints,
    },
  };
}
