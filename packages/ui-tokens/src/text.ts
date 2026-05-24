// Tiny text helpers shared across mobile + web. Each function was previously
// reinvented 5+ times — extracted here so a tweak in one place propagates.

/**
 * "Mostafa Admin" → "MA". "" → "" (caller is responsible for the fallback,
 * e.g. "TW" for the logo placeholder). Single-token names yield their first
 * character; multi-token names use the first character of the first two
 * tokens. Whitespace-only and empty tokens are skipped.
 */
export function initialsOf(name: string | null | undefined): string {
  if (!name) return "";
  return name
    .split(/\s+/)
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
