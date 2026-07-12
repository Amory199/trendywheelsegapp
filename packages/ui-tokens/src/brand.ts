// Full named brand palette from the brand guide. Lives in its own module
// (rather than inline in index.ts) so sibling token modules like ./categories
// can reference the hexes without importing ./index — which would create a
// require cycle that evaluates before `colors` is initialised.
export const brandColors = {
  friendlyBlue: "#2B0FF8",
  trendyPink: "#FF0065",
  ecoLimelight: "#A9F453",
  poolBlue: "#00C7EA",
  ultraRed: "#FF0000",
  trustWorth: "#02011F",
  loyalty: "#FFFFFF",
} as const;
