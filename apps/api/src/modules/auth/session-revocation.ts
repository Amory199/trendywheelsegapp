import { prisma } from "../../config/database.js";
import { env } from "../../config/env.js";
import { redis } from "../../config/redis.js";
import type { AuthPayload } from "../../middleware/auth.js";
import { logger } from "../../utils/logger.js";

// Server-side access-token revocation (INC-013). JWT validation is stateless,
// so a privilege change (role/status) can't be reflected in a token already in
// the wild until it expires (JWT_ACCESS_EXPIRY=24h). That let a just-demoted
// staff member keep staff access for up to a day.
//
// Fix: a per-user "sessions revoked at" marker in Redis. On a privilege change
// we (a) revoke refresh tokens and (b) stamp `auth:revoke:<userId>` = now. The
// authenticate middleware rejects any access token whose `iat` predates the
// marker, forcing the client through refresh (which now also fails) → logout.
// The marker auto-expires after the max access-token lifetime, since past that
// point no pre-cutoff token can still be valid, so the keyspace stays bounded.

const KEY_PREFIX = "auth:revoke:";

// Parse a jsonwebtoken-style duration ("24h", "30d", "15m", "3600") to seconds.
// Falls back to 24h so the marker always outlives a default-expiry token.
function accessTtlSeconds(): number {
  const raw = env.JWT_ACCESS_EXPIRY.trim();
  const m = /^(\d+)\s*([smhd])?$/.exec(raw);
  if (!m) return 24 * 60 * 60;
  const n = Number(m[1]);
  switch (m[2]) {
    case "s":
      return n;
    case "m":
      return n * 60;
    case "h":
      return n * 60 * 60;
    case "d":
      return n * 24 * 60 * 60;
    default:
      return n; // bare number = seconds
  }
}

// Revoke every active session for a user: kill refresh tokens AND mark all
// existing access tokens stale. Best-effort on Redis — a marker write failure
// must not block the admin action that triggered it (refresh revoke still
// landed, and the user re-validates on next cold start via /users/me).
export async function revokeUserSessions(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  try {
    await redis.set(`${KEY_PREFIX}${userId}`, Date.now().toString(), "EX", accessTtlSeconds());
  } catch (err) {
    logger.warn({ err, userId }, "session-revocation: failed to write Redis marker");
  }
}

// True if this access token was issued before its user's sessions were revoked.
// Fail-open: any Redis hiccup returns false so a transient outage can't lock
// every authenticated request out of the platform.
export async function isSessionRevoked(payload: AuthPayload): Promise<boolean> {
  const iat = payload.iat;
  if (!iat) return false; // no issued-at to compare → can't have been revoked
  try {
    const marker = await redis.get(`${KEY_PREFIX}${payload.userId}`);
    if (!marker) return false;
    // Prefer our millisecond issue time so a token can be ordered against the
    // (millisecond) marker EXACTLY — even within the same second. This satisfies
    // both guarantees at once: a token minted AFTER a revocation (user logs in
    // right after an admin password reset) survives (INC-046), while one minted
    // BEFORE a revocation (a just-disabled user's token) is killed (INC-013).
    // Tokens issued before iatMs existed fall back to second-granular `iat`.
    const issuedMs = payload.iatMs ?? iat * 1000;
    return issuedMs < Number(marker);
  } catch (err) {
    logger.warn(
      { err, userId: payload.userId },
      "session-revocation: Redis read failed, fail-open",
    );
    return false;
  }
}
