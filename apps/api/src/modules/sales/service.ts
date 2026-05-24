// Sales — service layer. Cache invalidation + status setter. The public list
// path stays in the controller because it owns the caching headers, but every
// write path goes through `invalidateSalesCache()` so the public cache stays
// coherent.

import { prisma } from "../../config/database.js";
import { redis } from "../../config/redis.js";

export const SALES_CACHE_TTL = 60;
export const SALES_CACHE_PREFIX = "sales:list:";

/**
 * Drop every `sales:list:*` cache entry. Cheap (KEYS on a sub-namespace) and
 * called on every create/update/status-change/delete so a fresh GET reflects
 * the new state immediately.
 */
export async function invalidateSalesCache(): Promise<void> {
  const keys = await redis.keys(`${SALES_CACHE_PREFIX}*`);
  if (keys.length > 0) await redis.del(...keys);
}

/**
 * Flip a listing's status. Used by the admin "mark sold / take down / restore"
 * affordances. Returns the updated row.
 */
export async function setListingStatus(
  id: string,
  status: "active" | "sold" | "pending",
): Promise<Awaited<ReturnType<typeof prisma.salesListing.update>>> {
  const listing = await prisma.salesListing.update({ where: { id }, data: { status } });
  await invalidateSalesCache();
  return listing;
}
