import { type Palette, spacing } from "@trendywheels/ui-tokens";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "../lib/use-theme";

export interface Stat {
  label: string;
  value: string | number;
  /** Optional accent color for the value (e.g. a status color). */
  tone?: string;
}

/**
 * Compact horizontal summary row shown at the top of the customer's "my X"
 * tracking screens (listings, rentals, trade-ins, orders). Gives an at-a-glance
 * "here's what you've done" dashboard so the screen isn't just a raw list.
 * Purely presentational + themed.
 */
export function StatStrip({ stats }: { stats: Stat[] }): JSX.Element {
  const { palette } = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  return (
    <View style={styles.row}>
      {stats.map((s, i) => (
        <View key={`${s.label}-${i}`} style={styles.chip}>
          <Text style={[styles.value, s.tone ? { color: s.tone } : null]}>{s.value}</Text>
          <Text style={styles.label} numberOfLines={1}>
            {s.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

function makeStyles(palette: Palette) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
    },
    chip: {
      flex: 1,
      backgroundColor: palette.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: palette.border,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      alignItems: "center",
      gap: 2,
    },
    value: { color: palette.text, fontSize: 20, fontWeight: "800" },
    label: { color: palette.muted, fontSize: 10, fontWeight: "600", textTransform: "uppercase" },
  });
}
