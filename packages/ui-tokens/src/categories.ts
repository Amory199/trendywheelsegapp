// Brand category outline colors. Each vehicle category carries a signature
// brand color — or a two-stop duo once the single colors run out (the brand
// deck's two-color plates) — used as the 2px outline on category circles,
// strip tiles, and listing cards. Trendy Pink is deliberately absent: it is
// reserved for the fuel-type badge and selected/active states, never a
// category outline.
//
// Loose string keys (not the VehicleCategory enum) to avoid a hard dependency
// on @trendywheels/types — unknown keys resolve to null via categoryColorOf.

import { brandColors } from "./brand";

export const categoryColors: Record<string, [string] | [string, string]> = {
  "golf-cart": [brandColors.ecoLimelight],
  scooter: [brandColors.poolBlue],
  "scooter-sidecar": [brandColors.friendlyBlue],
  buggy: [brandColors.ultraRed],
  utv: [brandColors.ecoLimelight, brandColors.friendlyBlue],
  "jet-ski": [brandColors.poolBlue, brandColors.friendlyBlue],
  "hover-board": [brandColors.ecoLimelight, brandColors.poolBlue],
};

// Null-safe lookup — callers usually hold `category: string | undefined`
// straight off an API payload.
export function categoryColorOf(
  key: string | null | undefined,
): [string] | [string, string] | null {
  if (!key) return null;
  return categoryColors[key] ?? null;
}
