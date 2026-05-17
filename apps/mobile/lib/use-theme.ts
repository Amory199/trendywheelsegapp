import { twPalette, type Palette } from "@trendywheels/ui-tokens";
import { useEffect, useState } from "react";
import { Appearance } from "react-native";

import { useAuth } from "./auth-store";

export type ThemeMode = "light" | "dark" | "system";

interface ResolvedTheme {
  mode: ThemeMode;
  isDark: boolean;
  palette: Palette;
}

/**
 * Resolves the active theme. Priority: explicit user.preferences.theme >
 * system color scheme > dark default. Re-renders when either input changes.
 */
export function useTheme(): ResolvedTheme {
  const stored = useAuth((s) => {
    const prefs = (s.user?.preferences ?? null) as { theme?: ThemeMode } | null;
    return prefs?.theme ?? "system";
  });
  const [system, setSystem] = useState(Appearance.getColorScheme() ?? "dark");

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystem(colorScheme ?? "dark");
    });
    return () => sub.remove();
  }, []);

  const mode: ThemeMode = stored;
  const isDark = stored === "system" ? system === "dark" : stored === "dark";
  const palette = twPalette(isDark);
  return { mode, isDark, palette };
}
