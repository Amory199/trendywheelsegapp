import { isRTL } from "@trendywheels/i18n";
import type { TextStyle } from "react-native";

import { useLocale } from "./locale";

/** True when the active locale renders right-to-left (Arabic). */
export function useRTL(): boolean {
  return isRTL(useLocale((s) => s.locale));
}

/**
 * Locale-aware display/heading style. `Anton` is a Latin-only display face — in
 * Arabic it falls back to a thin, mismatched system glyph and any letterSpacing
 * shreds the cursive joining. So in Arabic we drop Anton (heavy system weight)
 * and zero the tracking; in LTR we keep Anton + the requested letterSpacing.
 *
 * Usage: const display = useDisplay();  style={[styles.title, display(0.4)]}
 * (remove fontFamily:"Anton" + letterSpacing from the static style).
 */
export function useDisplay(): (letterSpacing?: number) => TextStyle {
  const rtl = useRTL();
  return (letterSpacing = 0): TextStyle =>
    rtl ? { fontWeight: "800" } : { fontFamily: "Anton", letterSpacing };
}

/**
 * letterSpacing that collapses to 0 in Arabic (where positive tracking breaks
 * letter joining) and is the given value in LTR. For non-Anton text that still
 * wants tracking in English (eyebrows, badges).
 *
 * Usage: const track = useTracking();  style={[styles.eyebrow, { letterSpacing: track(1.8) }]}
 */
export function useTracking(): (value: number) => number {
  const rtl = useRTL();
  return (value: number): number => (rtl ? 0 : value);
}
