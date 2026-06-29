import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";

import { BackButton } from "../../components/BackButton";
import { api } from "../../lib/api";
import { useT } from "../../lib/locale";
import { useDisplay, useTracking } from "../../lib/typography";

interface Agent {
  id: string;
  name?: string;
  phone?: string;
  staffRole?: string;
  salesTargetMonthly?: number;
  openLeadCount?: number;
  wonThisMonth?: number;
}

export default function CrmTeam(): React.JSX.Element {
  const t = useT();
  const display = useDisplay();
  const track = useTracking();
  const q = useQuery({
    queryKey: ["crm", "team"],
    queryFn: async (): Promise<Agent[]> => {
      const r = await api.crmTeam();
      return (r.data ?? []) as Agent[];
    },
  });

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <BackButton style={{ marginLeft: -8, marginBottom: 6 }} fallback="/crm/pipeline" />
        <Text style={[styles.kicker, { letterSpacing: track(1.5) }]}>{t("crm.team.kicker")}</Text>
        <Text style={[styles.title, display(0.3)]}>{t("crm.team.title")}</Text>
      </View>

      {q.isLoading ? (
        <ActivityIndicator color={colors.brand.trendyPink} style={{ marginTop: 40 }} size="large" />
      ) : (
        <FlatList<Agent>
          data={q.data ?? []}
          keyExtractor={(a) => a.id}
          contentContainerStyle={{ padding: 14, paddingBottom: 120, gap: 10 }}
          refreshControl={
            <RefreshControl
              refreshing={q.isFetching}
              onRefresh={() => q.refetch()}
              tintColor={colors.text.light}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color={colors.text.secondary} />
              <Text style={styles.emptyText}>{t("crm.team.empty")}</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(item.name ?? "?").slice(0, 1).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.name}>{item.name ?? t("crm.team.agentFallback")}</Text>
                <Text style={styles.meta}>
                  {item.staffRole ?? t("crm.team.defaultRole")} · {item.phone ?? ""}
                </Text>
                <View style={styles.statsRow}>
                  <Stat
                    label={t("crm.team.statOpen")}
                    value={item.openLeadCount ?? 0}
                    tint={colors.brand.poolBlue}
                  />
                  <Stat
                    label={t("crm.team.statWon")}
                    value={item.wonThisMonth ?? 0}
                    tint={colors.brand.ecoLimelight ?? "#A9F453"}
                  />
                  <Stat
                    label={t("crm.team.statTarget")}
                    value={Math.round(Number(item.salesTargetMonthly ?? 0) / 1000)}
                    tint={colors.brand.trendyPink}
                    suffix="k"
                  />
                </View>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

function Stat({
  label,
  value,
  tint,
  suffix,
}: {
  label: string;
  value: number;
  tint: string;
  suffix?: string;
}): React.JSX.Element {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: tint }]}>
        {value.toLocaleString()}
        {suffix ?? ""}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.dark.bg },
  header: { paddingTop: 72, paddingHorizontal: 18, paddingBottom: 14 },
  kicker: { color: colors.brand.trendyPink, fontSize: 11, fontWeight: "800" },
  title: {
    color: colors.text.light,
    fontSize: 28,
    textTransform: "uppercase",
    marginTop: 4,
  },
  empty: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyText: { color: colors.text.secondary, fontSize: 13 },
  card: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: colors.dark.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.brand.trendyPink + "33",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.brand.trendyPink, fontWeight: "800", fontSize: 16 },
  name: { color: colors.text.light, fontSize: 15, fontWeight: "700" },
  meta: { color: colors.text.secondary, fontSize: 11, textTransform: "capitalize" },
  statsRow: { flexDirection: "row", gap: 14, marginTop: 4 },
  stat: { alignItems: "flex-start" },
  statValue: { fontSize: 16, fontWeight: "800" },
  statLabel: { color: colors.text.secondary, fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
});
