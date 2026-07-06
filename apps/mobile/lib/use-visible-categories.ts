import { useQuery } from "@tanstack/react-query";
import { VEHICLE_CATEGORIES, type VehicleCategory } from "@trendywheels/types";

import { api } from "./api";

type CategoryEntry = (typeof VEHICLE_CATEGORIES)[number];

// Fetches the admin-configured HIDDEN category set from the public endpoint.
// Cached broadly — visibility changes rarely, and every category surface reads
// the same query key so one fetch feeds them all. Guests included (public
// route), so browsing respects the client's "golf carts + scooters only" setup.
function useHiddenCategorySet(): Set<string> {
  const q = useQuery({
    queryKey: ["category-visibility"],
    queryFn: () => api.request<{ data: { hidden: string[] } }>("GET", "/api/categories/visibility"),
    staleTime: 5 * 60 * 1000,
  });
  return new Set(q.data?.data?.hidden ?? []);
}

// The VEHICLE_CATEGORIES list with admin-hidden keys removed. Falls back to the
// full list while loading / on error so a category strip is never empty.
export function useVisibleCategories(): CategoryEntry[] {
  const hidden = useHiddenCategorySet();
  return VEHICLE_CATEGORIES.filter((c) => !hidden.has(c.key));
}

// True when a specific category has been hidden by the admin — used to guard the
// rent category screen so a hidden key (reached via a stale link) bounces back.
export function useIsCategoryHidden(key: VehicleCategory | undefined): boolean {
  const hidden = useHiddenCategorySet();
  return key != null && hidden.has(key);
}
