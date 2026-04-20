import type { Request, Response } from "express";

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
