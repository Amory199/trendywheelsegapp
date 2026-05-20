import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import { useRouter } from "expo-router";
import { useState } from "react";
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

interface Repair {
  id: string;
  category?: string;
  description?: string;
  status: string;
  createdAt: string;
  assignedMechanicId?: string | null;
  user?: { name?: string; phone?: string };
}

const STATUSES = ["submitted", "scheduled", "in_progress", "completed"] as const;
const STATUS_LABEL: Record<string, string> = {
  submitted: "Requested",
  scheduled: "Scheduled",
  in_progress: "In progress",
  completed: "Completed",
};
const STATUS_TONE: Record<string, string> = {
  submitted: colors.text.secondary,
  scheduled: colors.brand.poolBlue,
  in_progress: "#F5B800",
  completed: colors.brand.ecoLimelight ?? "#A9F453",
};

export default function AdminRepairs(): React.JSX.Element {
  const router = useRouter();
  const [status, setStatus] = useState<string>("submitted");

  const q = useQuery({
    queryKey: ["admin", "repairs", status],
    queryFn: async (): Promise<Repair[]> => {
      const r = await api.adminListRepairs({ status });
      return ((r as { data?: Repair[] }).data ?? []) as Repair[];
    },
  });

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.kicker}>WORK ORDERS</Text>
        <Text style={styles.title}>Repairs</Text>
      </View>

      <View style={styles.filterRow}>
        {STATUSES.map((s) => (
          <Pressable
            key={s}
            onPress={() => setStatus(s)}
            style={[styles.filter, status === s && styles.filterActive]}
          >
            <Text style={[styles.filterText, status === s && styles.filterTextActive]}>
              {STATUS_LABEL[s]}
            </Text>
          </Pressable>
        ))}
      </View>

      {q.isLoading ? (
        <ActivityIndicator color="#F5B800" style={{ marginTop: 40 }} size="large" />
      ) : (
        <FlatList<Repair>
          data={q.data ?? []}
          keyExtractor={(r) => r.id}
          removeClippedSubviews
          windowSize={7}
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
              <Ionicons name="construct-outline" size={48} color={colors.text.secondary} />
              <Text style={styles.emptyText}>No {STATUS_LABEL[status]} repairs</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => router.push(`/admin/repairs/${item.id}`)}>
              <View style={{ flex: 1, gap: 4 }}>
                <View style={styles.row}>
                  <Text style={styles.cat}>{item.category ?? "Repair"}</Text>
                  <View style={[styles.dot, { backgroundColor: STATUS_TONE[item.status] }]} />
                  <Text style={[styles.statusText, { color: STATUS_TONE[item.status] }]}>
                    {STATUS_LABEL[item.status] ?? item.status}
                  </Text>
                </View>
                <Text style={styles.desc} numberOfLines={2}>
                  {item.description ?? "—"}
                </Text>
                <Text style={styles.meta}>
                  {item.user?.name ?? "Customer"} · {new Date(item.createdAt).toLocaleDateString()}
                  {item.assignedMechanicId ? " · Assigned" : " · Unassigned"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.text.secondary} />
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.dark.bg },
  header: { paddingTop: 72, paddingHorizontal: 18, paddingBottom: 14 },
  kicker: { color: "#F5B800", fontSize: 11, fontWeight: "800", letterSpacing: 1.5 },
  title: {
    color: colors.text.light,
    fontSize: 28,
    fontFamily: "Anton",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginTop: 4,
  },
  filterRow: { flexDirection: "row", paddingHorizontal: 14, paddingBottom: 10, gap: 6 },
  filter: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  filterActive: { backgroundColor: "#F5B800", borderColor: "#F5B800" },
  filterText: { color: colors.text.secondary, fontSize: 11, fontWeight: "700" },
  filterTextActive: { color: "#000" },
  empty: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyText: { color: colors.text.secondary, fontSize: 13 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.dark.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: 12,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  cat: {
    color: colors.text.light,
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
    textTransform: "capitalize",
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: "700", textTransform: "capitalize" },
  desc: { color: colors.text.secondary, fontSize: 12 },
  meta: { color: colors.text.secondary, fontSize: 10 },
});
