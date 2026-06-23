import { resolveMx } from "node:dns/promises";

import { AppError } from "./errors.js";

// Well-known disposable / throwaway mail providers. Not exhaustive — the MX
// check below is the primary gate; this just blocks the common temp-mail
// domains that DO publish MX records and would otherwise slip through.
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "10minutemail.com",
  "tempmail.com",
  "temp-mail.org",
  "throwawaymail.com",
  "yopmail.com",
  "trashmail.com",
  "getnada.com",
  "sharklasers.com",
  "maildrop.cc",
  "dispostable.com",
  "fakeinbox.com",
  "mailnesia.com",
  "mintemail.com",
  "tempmailo.com",
  "emailondeck.com",
]);

// Short-lived MX cache so repeated signups on the same domain (e.g. gmail.com)
// don't re-query DNS each time.
const mxCache = new Map<string, { ok: boolean; at: number }>();
const MX_TTL_MS = 10 * 60 * 1000;

const UNDELIVERABLE_MSG = "That email domain can't receive mail — please double-check it.";

/**
 * Ensure an email is on a real, mail-accepting domain. Syntactic validation is
 * done upstream by Zod; this rejects domains with no MX records (junk like
 * "x@kkkkkk.com") and known disposable providers, so only deliverable emails
 * get saved. Network/DNS errors other than "domain has no mail records" fail
 * OPEN — a DNS blip must never block a legitimate signup.
 */
export async function assertDeliverableEmail(email: string): Promise<void> {
  const domain = email.trim().toLowerCase().split("@")[1];
  if (!domain || !domain.includes(".") || domain.includes("..")) {
    throw AppError.badRequest("Enter a valid email address.");
  }
  if (DISPOSABLE_DOMAINS.has(domain)) {
    throw AppError.badRequest("Please use a permanent email address, not a temporary one.");
  }

  const cached = mxCache.get(domain);
  if (cached && Date.now() - cached.at < MX_TTL_MS) {
    if (!cached.ok) throw AppError.badRequest(UNDELIVERABLE_MSG);
    return;
  }

  try {
    const mx = await resolveMx(domain);
    const ok = Array.isArray(mx) && mx.length > 0;
    mxCache.set(domain, { ok, at: Date.now() });
    if (!ok) throw AppError.badRequest(UNDELIVERABLE_MSG);
  } catch (err) {
    if (err instanceof AppError) throw err;
    const code = (err as NodeJS.ErrnoException).code;
    // ENOTFOUND (domain doesn't exist) / ENODATA (exists but no MX) → the
    // domain cannot receive mail, reject. Anything else (timeout, SERVFAIL,
    // network) is inconclusive → fail open so we never block a real user.
    if (code === "ENOTFOUND" || code === "ENODATA") {
      mxCache.set(domain, { ok: false, at: Date.now() });
      throw AppError.badRequest(UNDELIVERABLE_MSG);
    }
  }
}
