// Force EVERY user (except one break-glass admin) to set new credentials on
// their next login: null their password, revoke their sessions, and stamp a
// session-revocation marker so any live access token is rejected immediately.
//
// After this runs, a user opening the app enters their phone → (now passwordless)
// gets an OTP → lands on the set-credentials screen to choose a username +
// password. Staff/admin on unreachable test numbers are recovered by the
// break-glass admin via the admin web "Set password" button.
//
// The break-glass admin keeps its password so the admin dashboard is never
// locked out. Override with BREAK_GLASS_EMAIL=… (default admin@trendywheelseg.com).
//
// Guarded by RECRED_CONFIRM=YES.
//   RECRED_CONFIRM=YES tsx scripts/force-recredential.ts

import { prisma } from "../src/config/database.js";
import { redis } from "../src/config/redis.js";
import { logger } from "../src/utils/logger.js";

const BREAK_GLASS_EMAIL = (
  process.env.BREAK_GLASS_EMAIL ?? "admin@trendywheelseg.com"
).toLowerCase();
const REVOKE_KEY_PREFIX = "auth:revoke:"; // must match session-revocation.ts
const ACCESS_TTL_SECONDS = 24 * 60 * 60; // outlives a default-expiry access token

async function main(): Promise<void> {
  if (process.env.RECRED_CONFIRM !== "YES") {
    console.error("Refusing to run without RECRED_CONFIRM=YES.");
    console.error("  RECRED_CONFIRM=YES tsx scripts/force-recredential.ts");
    process.exit(2);
  }

  const keep = await prisma.user.findFirst({
    where: { email: { equals: BREAK_GLASS_EMAIL, mode: "insensitive" } },
    select: { id: true, email: true },
  });
  const keepId = keep?.id ?? null;
  console.log(`Break-glass admin kept: ${keep?.email ?? "(NONE FOUND — resetting everyone)"}`);

  // 1. Null passwords for everyone except the break-glass admin.
  const nulled = await prisma.user.updateMany({
    where: {
      passwordHash: { not: null },
      ...(keepId ? { id: { not: keepId } } : {}),
    },
    data: { passwordHash: null },
  });
  console.log(`Passwords nulled: ${nulled.count}`);

  // 2. Revoke every active refresh token except the break-glass admin's.
  const revoked = await prisma.refreshToken.updateMany({
    where: { revokedAt: null, ...(keepId ? { userId: { not: keepId } } : {}) },
    data: { revokedAt: new Date() },
  });
  console.log(`Refresh tokens revoked: ${revoked.count}`);

  // 3. Stamp a revocation marker per affected user → live access tokens rejected
  //    immediately (forced re-credential now, not a 24h wait until expiry).
  const users = await prisma.user.findMany({
    where: keepId ? { id: { not: keepId } } : {},
    select: { id: true },
  });
  const marker = Date.now().toString();
  let markers = 0;
  for (const u of users) {
    try {
      await redis.set(`${REVOKE_KEY_PREFIX}${u.id}`, marker, "EX", ACCESS_TTL_SECONDS);
      markers++;
    } catch (err) {
      logger.warn({ err, userId: u.id }, "force-recred: marker write failed");
    }
  }
  console.log(`Session-revocation markers set: ${markers}`);
  console.log("Done — every non-break-glass user must set new credentials on next login.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    redis.disconnect();
  });
