import type { Request, Response } from "express";

import { assertDeliverableEmail } from "../../utils/email-validation.js";
import { writeError } from "../../utils/error-sink.js";
import { AppError } from "../../utils/errors.js";
import { verifyFirebaseIdToken } from "../../utils/firebase.js";
import { notifyAdmins, notifyUser } from "../../utils/notify.js";

import * as authService from "./service.js";

export async function sendOtp(req: Request, res: Response): Promise<void> {
  const { phone } = req.body;
  const result = await authService.sendOtp(phone);
  res.json(result);
}

export async function verifyOtp(req: Request, res: Response): Promise<void> {
  const { phone, otp } = req.body;
  const result = await authService.verifyOtp(phone, otp);
  res.json(result);
}

// Admin-only: generate a manual login code for a user who can't get a Firebase
// SMS. Returns the code to the admin, who relays it to the user out-of-band.
// Recorded so there's an audit trail of who issued a code for which phone.
export async function adminIssueOtp(req: Request, res: Response): Promise<void> {
  const { phone } = req.body as { phone: string };
  const result = await authService.adminIssueOtp(phone);
  await writeError({
    level: "warn",
    source: "admin",
    message: "admin_issued_otp",
    metadata: { phone, byAdminId: req.user?.userId, userExists: result.userExists },
  });
  res.json({ code: result.code, expiresAt: result.expiresAt, userExists: result.userExists });
}

// Customer taps "didn't get a code". Public + rate-limited. Creates a pending
// manual-OTP request and pushes every ADMIN (not staff). 409 once the phone has
// already used its one-time manual path. The device polls getOtpRequest.
export async function requestManualOtp(req: Request, res: Response): Promise<void> {
  const { phone } = req.body as { phone: string };
  try {
    const { requestId, status, reused } = await authService.createOtpRequest(phone);
    if (!reused) {
      await notifyAdmins(
        `otp-request-${requestId}`,
        {
          type: "otp_request",
          title: "Manual OTP requested",
          body: `${phone} can't receive a code. Tap to issue one.`,
          data: { type: "otp_request", phone, requestId },
        },
        { adminOnly: true },
      );
      await writeError({
        level: "warn",
        source: "customer",
        message: "manual_otp_requested",
        metadata: { phone, requestId },
      });
    }
    res.json({ data: { requestId, status } });
  } catch (err) {
    if (err instanceof authService.OtpRequestExhaustedError) {
      res.status(409).json({ error: err.message, status: "exhausted" });
      return;
    }
    throw err;
  }
}

// Admin issues a real code for a pending request. Writes an otp_codes row and
// flips the request to `issued`; the waiting device picks the code up on its
// next poll. Best-effort push to the user too, if they have an account/token.
export async function issueManualOtp(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const adminId = req.user!.userId;
  const result = await authService.issueOtpRequest(id, adminId);
  if (result.userId) {
    await notifyUser(result.userId, `otp-issued-${id}`, {
      type: "otp_code",
      title: "Your verification code",
      body: `Your TrendyWheels code is ${result.code}. It expires in 15 minutes.`,
      data: { type: "otp_code", requestId: id, code: result.code },
    });
  }
  await writeError({
    level: "warn",
    source: "admin",
    message: "manual_otp_issued",
    metadata: { requestId: id, phone: result.phone, byAdminId: adminId },
  });
  res.json({ data: { ok: true } });
}

// Public poll for the waiting device. Returns the code only while `issued`.
export async function getManualOtp(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const result = await authService.getOtpRequest(id);
  res.json({ data: result });
}

// Admin inbox: pending manual-OTP requests.
export async function listManualOtpRequests(_req: Request, res: Response): Promise<void> {
  const data = await authService.listPendingOtpRequests();
  res.json({ data });
}

// Pre-login routing: should this phone use password or OTP? (See service.)
export async function loginMethod(req: Request, res: Response): Promise<void> {
  const { phone } = req.body;
  const result = await authService.getLoginMethod(phone);
  res.json(result);
}

export async function refreshToken(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body;
  const result = await authService.refreshAccessToken(refreshToken);
  res.json(result);
}

export async function logout(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  // Optional: the device's Expo push token, so only THIS device stops
  // receiving pushes. Without it we unbind all the user's tokens — the safe
  // default for shared/handed-over devices (next login re-registers).
  const pushToken = typeof req.body?.pushToken === "string" ? req.body.pushToken : undefined;
  await authService.logout(userId, pushToken);
  res.json({ success: true });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;
  const result = await authService.loginWithPassword(email, password);
  res.json(result);
}

// Set name + email + password on the authenticated user (post-OTP signup or
// profile). Lets the customer sign in with credentials next time.
export async function setCredentials(req: Request, res: Response): Promise<void> {
  const { name, email, username, password, age } = req.body;
  // Email is optional here; when given it must be a real, deliverable domain.
  if (email) await assertDeliverableEmail(email);
  const result = await authService.setCredentials(req.user!.userId, {
    name,
    email,
    username,
    password,
    age,
  });
  res.json(result);
}

// Admin "act as": mint a scoped token for a customer/staff preview. Route is
// admin-gated; we additionally refuse to assume FROM an already-acting token so
// an impersonation session can never be used to re-escalate.
export async function assumeRole(req: Request, res: Response): Promise<void> {
  if (req.user!.actingAs) {
    throw AppError.forbidden("Exit the current role before switching again");
  }
  const { role, staffRole } = req.body;
  const result = await authService.assumeRole(req.user!.userId, role, staffRole);
  res.json(result);
}

/**
 * Exchange a Firebase Phone Auth ID token for our JWT pair. Trust boundary:
 * Firebase already verified the SMS code on-device + minted the ID token,
 * which is then verified by firebase-admin against Google's public certs.
 * The phone_number claim is the authoritative identifier — we never trust
 * any phone value sent by the client outside of that claim.
 */
export async function firebaseToken(req: Request, res: Response): Promise<void> {
  const { idToken } = req.body as { idToken?: string };
  if (!idToken || typeof idToken !== "string") {
    throw AppError.badRequest("idToken is required");
  }
  let decoded;
  try {
    decoded = await verifyFirebaseIdToken(idToken);
  } catch (err) {
    void writeError({
      level: "warn",
      source: "api",
      message: "Firebase ID token verification failed",
      stack: err instanceof Error ? err.stack : null,
      route: "/api/auth/firebase-token",
      method: "POST",
      ipAddress:
        (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ||
        req.ip ||
        null,
      userAgent: (req.headers["user-agent"] as string | undefined) ?? null,
      metadata: { reason: err instanceof Error ? err.message : "unknown" },
    });
    throw AppError.unauthorized("Invalid Firebase token");
  }
  const phone = decoded.phone_number;
  if (!phone) {
    throw AppError.unauthorized("Firebase token has no phone claim");
  }
  const result = await authService.issueTokensForPhone(phone);
  res.json(result);
}
