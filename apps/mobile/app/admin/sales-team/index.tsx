// Admin Sales Team console. The owner's at-a-glance view of the whole staff
// roster: who's carrying how many open leads, what each closed this month vs
// their target, and a fast path into the unassigned pool to hand work out.
// Tap an agent to drill into their leads, reassign, or set their target.

import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { api } from "../../../lib/api";

interface Agent {
  id: string;
  name?: string;
  email?: string | null;
  staffRole?: string | null;
  salesTargetMonthly?: number | string | null;
  monthWonAmount?: number;
  monthWonCount?: number;
  openLeads?: number;
  progressPct?: number | null;
}

export default function AdminSalesTeam(): React.JSX.Element {
  const router = useRouter();

  const teamQ = useQuery({
    queryKey: ["admin", "sales-team"],
    queryFn: async (): Promise<Agent[]> => {
      const r = await api.crmTeam();
      return (r.data ?? []) as Agent[];
    },
  });

  const poolQ = useQuery({
    queryKey: ["admin", "sales-team", "pool"],
    queryFn: async (): Promise<number> => {
      const r = await api.crmLeads({ ownerId: "unassigned" });
      return (r.data ?? []).length;
    },
  });

  // Only show staff who actually carry sales work (sales role, or no subrole).
  const agents = (teamQ.data ?? []).filter(
    (a) => a.staffRole === "sales" || a.staffRole === "admin" || !a.staffRole,
  );
  const poolCount = poolQ.data ?? 0;

  const totalOpen = agents.reduce((s, a) => s + (a.openLeads ?? 0), 0);
  const totalWon = agents.reduce((s, a) => s + (a.monthWonAmount ?? 0), 0);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.kicker}>SALES CONSOLE</Text>
        <Text style={styles.title}>Sales Team</Text>
        <Text style={styles.subtitle}>
          {agents.length} agents · {totalOpen} open leads · EGP{" "}
          {Math.round(totalWon).toLocaleString()} won this month
        </Text>
      </View>

      {teamQ.isLoading ? (
        <ActivityIndicator color={colors.brand.trendyPink} style={{ marginTop: 40 }} size="large" />
      ) : (
        <FlatList<Agent>
          data={agents}
          keyExtractor={(a) => a.id}
          contentContainerStyle={{ padding: 14, paddingBottom: 120, gap: 10 }}
          refreshControl={
            <RefreshControl
              refreshing={teamQ.isFetching}
              onRefresh={() => {
                void teamQ.refetch();
                void poolQ.refetch();
              }}
              tintColor={colors.text.light}
            />
          }
          ListHeaderComponent={
            <Pressable
              style={styles.poolCard}
              onPress={() => router.push("/admin/sales-team/unassigned")}
            >
              <View style={styles.poolIcon}>
                <Ionicons name="flag" size={20} color="#F5B800" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.poolTitle}>Unassigned pool</Text>
                <Text style={styles.poolMeta}>
                  {poolCount === 0
                    ? "All leads are assigned"
                    : `${poolCount} waiting to be handed out`}
                </Text>
              </View>
              {poolCount > 0 ? (
                <View style={styles.poolBadge}>
                  <Text style={styles.poolBadgeText}>{poolCount}</Text>
                </View>
              ) : null}
              <Ionicons name="chevron-forward" size={18} color={colors.text.secondary} />
            </Pressable>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color={colors.text.secondary} />
              <Text style={styles.emptyText}>No sales agents yet</Text>
            </View>
          }
          renderItem={({ item }) => {
            const pct = item.progressPct;
            const target = Number(item.salesTargetMonthly ?? 0);
            return (
              <Pressable
                style={styles.card}
                onPress={() => router.push(`/admin/sales-team/${item.id}`)}
              >
                <View style={styles.topRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {(item.name ?? "?").slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{item.name ?? "Agent"}</Text>
                    <Text style={styles.meta}>{item.staffRole ?? "staff"}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.text.secondary} />
                </View>

                <View style={styles.statsRow}>
                  <Stat label="Open" value={item.openLeads ?? 0} tint={colors.brand.poolBlue} />
                  <Stat
                    label="Won (mo)"
                    value={item.monthWonCount ?? 0}
                    tint={colors.brand.ecoLimelight ?? "#A9F453"}
                  />
                  <Stat
                    label="Revenue"
                    value={Math.round((item.monthWonAmount ?? 0) / 1000)}
                    suffix="k"
                    tint={colors.brand.trendyPink}
                  />
                </View>

                {target > 0 ? (
                  <View style={{ gap: 4, marginTop: 4 }}>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            width: `${Math.max(2, pct ?? 0)}%`,
                            backgroundColor:
                              (pct ?? 0) >= 100
                                ? (colors.brand.ecoLimelight ?? "#A9F453")
                                : colors.brand.trendyPink,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.targetText}>
                      {pct ?? 0}% of EGP {Math.round(target).toLocaleString()} target
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.noTarget}>No monthly target set — tap to set one</Text>
                )}
              </Pressable>
            );
          }}
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
  kicker: { color: colors.brand.trendyPink, fontSize: 11, fontWeight: "800", letterSpacing: 1.5 },
  title: {
    color: colors.text.light,
    fontSize: 28,
    fontFamily: "Anton",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginTop: 4,
  },
  subtitle: { color: colors.text.secondary, fontSize: 12, marginTop: 4 },
  empty: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyText: { color: colors.text.secondary, fontSize: 13 },
  poolCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.dark.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F5B80044",
    padding: 14,
    marginBottom: 4,
  },
  poolIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5B80022",
    alignItems: "center",
    justifyContent: "center",
  },
  poolTitle: { color: colors.text.light, fontSize: 15, fontWeight: "800" },
  poolMeta: { color: colors.text.secondary, fontSize: 11, marginTop: 2 },
  poolBadge: {
    backgroundColor: "#F5B800",
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  poolBadgeText: { color: "#000", fontWeight: "800", fontSize: 12 },
  card: {
    backgroundColor: colors.dark.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: 14,
    gap: 10,
  },
  topRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brand.trendyPink + "33",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.brand.trendyPink, fontWeight: "800", fontSize: 16 },
  name: { color: colors.text.light, fontSize: 15, fontWeight: "700" },
  meta: { color: colors.text.secondary, fontSize: 11, textTransform: "capitalize" },
  statsRow: { flexDirection: "row", gap: 22 },
  stat: { alignItems: "flex-start" },
  statValue: { fontSize: 18, fontWeight: "800" },
  statLabel: { color: colors.text.secondary, fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  barTrack: {
    height: 7,
    borderRadius: 999,
    backgroundColor: colors.dark.bg,
    overflow: "hidden",
  },
  barFill: { height: 7, borderRadius: 999 },
  targetText: { color: colors.text.secondary, fontSize: 11 },
  noTarget: { color: colors.text.secondary, fontSize: 11, fontStyle: "italic" },
});
