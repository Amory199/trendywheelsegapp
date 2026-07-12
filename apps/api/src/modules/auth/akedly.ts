import crypto from "crypto";

import { env } from "../../config/env.js";
import { logger } from "../../utils/logger.js";

// ─── Akedly OTP delivery (V1.2 REST) ─────────────────────────
// Akedly is our SMS transport, replacing on-device Firebase phone-auth (too
// expensive + App Check / Play Integrity delivery failures). We generate the
// code ourselves and pass it to Akedly to DELIVER — verification still happens
// locally against the otp_codes table (see verifyOtp), so the manual-admin-OTP
// backstop and the Apple-review bypass are entirely unaffected by this module.
//
// Flow (all server-side; the pipeline has turnstile.required=false so no browser
// widget is needed):
//   1. GET  /transactions/challenge?APIKey&pipelineID  → { challenge, difficulty, challengeToken }
//   2. solve Proof-of-Work: find nonce s.t. SHA256(challenge + ":" + nonce) has
//      `difficulty` leading hex zeros (difficulty 3 ⇒ a few thousand hashes, sub-ms)
//   3. POST /transactions/send  { APIKey, pipelineID, verificationAddress, powSolution, digits, otp }
//
// Everything is gated by AKEDLY_ENABLED; when off (or misconfigured) sendAkedlyOtp
// is never called and the auth path behaves exactly as before.

const REQUEST_TIMEOUT_MS = 8000;
// PoW is expected to need ~16^difficulty hashes on average (difficulty 3 ⇒ ~4096).
// Cap far above that so a pathological challenge can never spin the event loop.
const MAX_POW_ITERATIONS = 20_000_000;

interface ChallengeData {
  challenge: string;
  difficulty: number;
  challengeToken: string;
  turnstile?: { required?: boolean };
}

export class AkedlyError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "AkedlyError";
    this.code = code;
  }
}

async function akedlyFetch(url: string, init?: RequestInit): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok || body?.status === "error") {
      const code = String(body?.code ?? `HTTP_${res.status}`);
      const message = String(body?.message ?? `Akedly request failed (${res.status})`);
      throw new AkedlyError(code, message);
    }
    return body;
  } catch (err) {
    if (err instanceof AkedlyError) throw err;
    if ((err as { name?: string })?.name === "AbortError") {
      throw new AkedlyError("TIMEOUT", "Akedly request timed out");
    }
    throw new AkedlyError("NETWORK", (err as Error)?.message ?? "Akedly network error");
  } finally {
    clearTimeout(timer);
  }
}

// Solve the Proof-of-Work: the first nonce whose SHA256(challenge:nonce) hex
// digest starts with `difficulty` zeros. Synchronous but bounded + cheap.
function solvePow(challenge: string, difficulty: number): number {
  const prefix = "0".repeat(Math.max(0, difficulty));
  for (let nonce = 0; nonce < MAX_POW_ITERATIONS; nonce++) {
    const hash = crypto.createHash("sha256").update(`${challenge}:${nonce}`).digest("hex");
    if (hash.startsWith(prefix)) return nonce;
  }
  throw new AkedlyError("POW_UNSOLVED", `PoW not solved within ${MAX_POW_ITERATIONS} iterations`);
}

function extractData<T>(body: unknown): T {
  const data = (body as { data?: unknown })?.data;
  if (!data) throw new AkedlyError("BAD_RESPONSE", "Akedly response missing data");
  return data as T;
}

/**
 * Deliver `code` to `phone` over Akedly SMS. Throws AkedlyError on any failure
 * (misconfig, network, rate-limit, inactive pipeline) so the caller can surface
 * it to the user (who then falls back to the manual-code path). `endUserIp` is
 * forwarded as x-end-user-ip so Akedly's per-IP rate-limit sees the real client,
 * not our server.
 */
export async function sendAkedlyOtp(
  phone: string,
  code: string,
  endUserIp?: string,
): Promise<{ transactionReqID: string; channels: string[] }> {
  if (!env.AKEDLY_API_KEY || !env.AKEDLY_PIPELINE_ID) {
    throw new AkedlyError("NOT_CONFIGURED", "Akedly API key / pipeline id not set");
  }
  const base = env.AKEDLY_BASE_URL.replace(/\/$/, "");
  const key = env.AKEDLY_API_KEY;
  const pipelineID = env.AKEDLY_PIPELINE_ID;

  // 1. Challenge
  const challengeBody = await akedlyFetch(
    `${base}/transactions/challenge?APIKey=${encodeURIComponent(key)}&pipelineID=${encodeURIComponent(pipelineID)}`,
    { method: "GET", headers: { "Content-Type": "application/json" } },
  );
  const challenge = extractData<ChallengeData>(challengeBody);
  if (challenge.turnstile?.required) {
    // This pipeline demands a browser Turnstile token — our server-only flow
    // can't produce one. Fail loudly so it's caught, not silently unsent.
    throw new AkedlyError(
      "TURNSTILE_REQUIRED",
      "Pipeline requires Turnstile; server-side send unsupported",
    );
  }

  // 2. Proof-of-Work
  const nonce = solvePow(challenge.challenge, challenge.difficulty);

  // 3. Send — pass our own `otp` so Akedly delivers the exact code we stored.
  const sendBody = await akedlyFetch(`${base}/transactions/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(endUserIp ? { "x-end-user-ip": endUserIp } : {}),
    },
    body: JSON.stringify({
      APIKey: key,
      pipelineID,
      verificationAddress: { phoneNumber: phone },
      powSolution: { challengeToken: challenge.challengeToken, nonce },
      digits: code.length,
      otp: code,
    }),
  });
  const data = extractData<{ transactionReqID: string; channels?: string[] }>(sendBody);
  logger.info(
    { phone: phone.slice(-4), channels: data.channels, msg: "akedly_otp_sent" },
    "Akedly OTP delivered",
  );
  return { transactionReqID: data.transactionReqID, channels: data.channels ?? [] };
}
