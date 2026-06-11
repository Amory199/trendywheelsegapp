// Compact "My month" earnings card shown at the top of the sales pipeline.
// Surfaces the agent's won amount, target progress and estimated commission.
// Renders nothing while loading or on error so it can never break the screen.

import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { colors, type Palette } from "@trendywheels/ui-tokens";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { api } from "../../lib/api";
import { useTheme } from "../../lib/use-theme";

export function EarningsCard(): React.JSX.Element | null {
  const { palette } = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  const earningsQ = useQuery({
    queryKey: ["crm-my-earnings"],
    queryFn: async () => {
      const r = await api.crmMyEarnings();
      return r.data;
    },
    staleTime: 60_000,
  });

  const e = earningsQ.data;
  if (!e) return null;

  const fillPct = e.progressPct === null ? 0 : Math.max(0, Math.min(100, e.progressPct));

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>MY MONTH · {e.month}</Text>
          <Text style={styles.wonValue}>EGP {e.monthWonAmount.toLocaleString()}</Text>
        </View>
        <View style={styles.dealsChip}>
          <Ionicons name="trophy" size={12} color={colors.brand.ecoLimelight ?? "#A9F453"} />
          <Text style={styles.dealsText}>{e.monthWonCount} deals</Text>
        </View>
      </View>

      {e.progressPct !== null ? (
        <View style={{ gap: 4 }}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${fillPct}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {e.progressPct}% of EGP {e.targetMonthly.toLocaleString()}
          </Text>
        </View>
      ) : (
        <Text style={styles.noTarget}>No target set</Text>
      )}

      {e.commissionPct > 0 ? (
        <Text style={styles.commission}>
          ≈ EGP {e.estimatedCommission.toLocaleString()} commission ({e.commissionPct}%)
        </Text>
      ) : null}

      <View style={styles.secondaryRow}>
        <View style={styles.secondaryItem}>
          <Ionicons name="flag-outline" size={12} color={palette.muted} />
          <Text style={styles.secondaryText}>{e.openLeads} open leads</Text>
        </View>
        <View style={styles.secondaryItem}>
          <Ionicons name="cash-outline" size={12} color={palette.muted} />
          <Text style={styles.secondaryText}>EGP {e.pipelineValue.toLocaleString()} pipeline</Text>
        </View>
      </View>
    </View>
  );
}

function makeStyles(palette: Palette) {
  return StyleSheet.create({
    card: {
      marginHorizontal: 14,
      marginTop: 10,
      backgroundColor: palette.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: palette.border,
      padding: 14,
      gap: 10,
    },
    topRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    label: {
      color: colors.brand.trendyPink,
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 1.2,
    },
    wonValue: {
      color: palette.text,
      fontSize: 20,
      fontWeight: "800",
      marginTop: 2,
      fontFamily: "Anton",
      letterSpacing: 0.4,
    },
    dealsChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: (colors.brand.ecoLimelight ?? "#A9F453") + "22",
    },
    dealsText: {
      color: colors.brand.ecoLimelight ?? "#A9F453",
      fontWeight: "800",
      fontSize: 12,
    },
    progressTrack: {
      height: 6,
      borderRadius: 999,
      backgroundColor: palette.border,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: 999,
      backgroundColor: colors.brand.trendyPink,
    },
    progressText: { color: palette.muted, fontSize: 11, fontWeight: "700" },
    noTarget: { color: palette.muted, fontSize: 11 },
    commission: {
      color: colors.brand.ecoLimelight ?? "#A9F453",
      fontSize: 12,
      fontWeight: "800",
    },
    secondaryRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
      borderTopWidth: 1,
      borderTopColor: palette.border,
      paddingTop: 10,
    },
    secondaryItem: { flexDirection: "row", alignItems: "center", gap: 5 },
    secondaryText: { color: palette.muted, fontSize: 11, fontWeight: "700" },
  });
}
