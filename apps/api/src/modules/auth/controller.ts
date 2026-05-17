import type { Request, Response } from "express";

import { AppError } from "../../utils/errors.js";
import { verifyFirebaseIdToken } from "../../utils/firebase.js";

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

export async function refreshToken(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body;
  const result = await authService.refreshAccessToken(refreshToken);
  res.json(result);
}

export async function logout(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  await authService.logout(userId);
  res.json({ success: true });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;
  const result = await authService.loginWithPassword(email, password);
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
  const decoded = await verifyFirebaseIdToken(idToken);
  const phone = decoded.phone_number;
  if (!phone) {
    throw AppError.unauthorized("Firebase token has no phone claim");
  }
  const result = await authService.issueTokensForPhone(phone);
  res.json(result);
}
