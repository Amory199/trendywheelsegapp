import crypto from "crypto";

import type { Request, Response } from "express";

import { env } from "../../config/env.js";
import { writeError } from "../../utils/error-sink.js";
import { logger } from "../../utils/logger.js";

// ─── Akedly back-end callback (webhook) ──────────────────────
// Akedly POSTs delivery outcomes for each OTP transaction here. It signs with
// the svix scheme: HMAC-SHA256 over "<svix-id>.<svix-timestamp>.<raw body>",
// keyed by the base64 body of the "whsec_…" secret, emitted as a space-separated
// list of "v1,<base64>" signatures.
//
// This is observability only — we generate and verify OTPs ourselves against
// otp_codes (Architecture B), so a missed or replayed callback can never affect
// whether a user can log in. Its value is telling us WHY a code never arrived
// (undelivered / expired / wrong channel), which was the exact blind spot that
// made Firebase painful.

const TOLERANCE_SECONDS = 5 * 60;

function timingSafeEq(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Verify a svix-style signature header. Returns true when the timestamp is
 * within tolerance AND at least one v1 signature matches. Constant-time compare;
 * never throws on malformed input (bad base64, missing headers → false).
 */
export function verifySvixSignature(args: {
  secret: string;
  id: string;
  timestamp: string;
  signature: string;
  rawBody: string;
}): boolean {
  const { secret, id, timestamp, signature, rawBody } = args;
  if (!secret || !id || !timestamp || !signature) return false;

  // Replay window — a captured callback stops being accepted after 5 minutes.
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - ts) > TOLERANCE_SECONDS) return false;

  const keyPart = secret.startsWith("whsec_") ? secret.slice("whsec_".length) : secret;
  const key = Buffer.from(keyPart, "base64");
  if (key.length === 0) return false;

  const expected = crypto
    .createHmac("sha256", key)
    .update(`${id}.${timestamp}.${rawBody}`)
    .digest();

  for (const part of signature.split(" ")) {
    const [version, sig] = part.split(",");
    if (version !== "v1" || !sig) continue;
    const got = Buffer.from(sig, "base64");
    if (got.length > 0 && timingSafeEq(expected, got)) return true;
  }
  return false;
}

// Akedly's payload shape isn't contractually fixed, so read defensively and keep
// the whole body in metadata rather than assuming a schema.
function pickString(body: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = body[k];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return undefined;
}

const FAILURE_HINTS = ["fail", "error", "expire", "reject", "undeliver", "cancel"];

export async function akedlyWebhook(req: Request, res: Response): Promise<void> {
  // No secret configured = we cannot authenticate the sender. Refuse rather
  // than record attacker-supplied delivery reports.
  if (!env.AKEDLY_WEBHOOK_SECRET) {
    res.status(503).json({ status: "error", message: "Akedly webhook not configured" });
    return;
  }

  const raw = (req as Request & { rawBody?: Buffer }).rawBody;
  // rawBody is captured in app.ts for this exact path; re-serializing the parsed
  // body would change key order and break the HMAC, so treat its absence as fatal.
  if (!raw) {
    res.status(400).json({ status: "error", message: "Missing raw body" });
    return;
  }

  const svixId = String(req.headers["svix-id"] ?? "");
  const ok = verifySvixSignature({
    secret: env.AKEDLY_WEBHOOK_SECRET,
    id: svixId,
    timestamp: String(req.headers["svix-timestamp"] ?? ""),
    signature: String(req.headers["svix-signature"] ?? ""),
    rawBody: raw.toString("utf8"),
  });

  if (!ok) {
    await writeError({
      level: "warn",
      source: "api",
      message: "akedly_webhook_bad_signature",
      route: "/api/auth/akedly/webhook",
      method: "POST",
      statusCode: 401,
      metadata: { svixId },
    });
    res.status(401).json({ status: "error", message: "Invalid signature" });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const status = pickString(body, "status", "event", "type", "state") ?? "unknown";
  const transactionId = pickString(body, "transactionID", "transactionId", "transactionReqID");
  const channel = pickString(body, "channel", "channelUsed");
  const phone = pickString(body, "phoneNumber", "phone", "verificationAddress");
  // Never log a full phone number — last 4 is enough to correlate with a report.
  const phoneTail = phone ? phone.slice(-4) : undefined;

  const failed = FAILURE_HINTS.some((h) => status.toLowerCase().includes(h));

  if (failed) {
    await writeError({
      level: "warn",
      source: "api",
      message: `akedly_delivery_failed: ${status}`,
      route: "/api/auth/akedly/webhook",
      method: "POST",
      metadata: { svixId, transactionId, channel, phoneTail, payload: body },
    });
  } else {
    logger.info(
      { msg: "akedly_webhook", status, transactionId, channel, phone: phoneTail },
      "Akedly delivery callback",
    );
  }

  // Always 200 on a verified callback so Akedly doesn't retry a report we've
  // already recorded.
  res.status(200).json({ received: true });
}
