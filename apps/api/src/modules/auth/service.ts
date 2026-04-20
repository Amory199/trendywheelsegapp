import crypto from "crypto";

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { prisma } from "../../config/database.js";
import { env } from "../../config/env.js";
import type { AuthPayload } from "../../middleware/auth.js";
import { AppError } from "../../utils/errors.js";
import { logger } from "../../utils/logger.js";

function generateOtp(): string {
  return crypto.randomInt(100000, 999999).toString();
}

function signAccessToken(payload: AuthPayload): string {
  return jwt.sign(payload, env.JWT_PRIVATE_KEY, {
    algorithm: "RS256",
    expiresIn: env.JWT_ACCESS_EXPIRY as string,
  } as jwt.SignOptions);
}

function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString("hex");
}

export async function sendOtp(phone: string): Promise<{ success: boolean; message: string }> {
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

  // Find or create user
  let user = await prisma.user.findUnique({ where: { phone } });
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
      accountType: user.accountType,
      loyaltyTier: user.loyaltyTier,
      loyaltyPoints: user.loyaltyPoints,
    },
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<{ token: string }> {
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

  // Rotate: revoke old, issue new
  await prisma.refreshToken.update({
    where: { id: matchedToken.id },
    data: { revokedAt: new Date() },
  });

  const payload: AuthPayload = {
    userId: matchedToken.user.id,
    accountType: matchedToken.user.accountType,
  };

  return { token: signAccessToken(payload) };
}

export async function logout(userId: string): Promise<void> {
  // Revoke all refresh tokens for this user
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
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
      accountType: user.accountType,
      loyaltyTier: user.loyaltyTier,
      loyaltyPoints: user.loyaltyPoints,
    },
  };
}
