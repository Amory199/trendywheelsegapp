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

import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-store";

interface Ticket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  category?: string;
  createdAt: string;
  user?: { name?: string; phone?: string };
}

const FILTERS: Array<{ key: string; label: string }> = [
  { key: "open", label: "Open" },
  { key: "in_progress", label: "In Progress" },
  { key: "resolved", label: "Resolved" },
];

const PRIORITY_COLOR: Record<string, string> = {
  urgent: "#FF0000",
  high: "#FF7A00",
  medium: "#F5B800",
  low: "#7AD2FF",
};

export default function SupportTickets(): JSX.Element {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const [status, setStatus] = useState("open");

  const listQ = useQuery({
    queryKey: ["support", "tickets", status],
    queryFn: async (): Promise<Ticket[]> => {
      const r = await api.getTickets({ status, limit: 50 });
      return (r.data ?? []) as unknown as Ticket[];
    },
  });

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View>
          <Text style={styles.hello}>Hi, {user?.name?.split(" ")[0] ?? "Agent"}</Text>
          <Text style={styles.role}>SUPPORT · INBOX</Text>
        </View>
        <Pressable
          hitSlop={12}
          onPress={async () => {
            await logout();
            router.replace("/(auth)/phone");
          }}
        >
          <Ionicons name="log-out-outline" size={22} color={colors.text.light} />
        </Pressable>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => setStatus(f.key)}
            style={[styles.filter, status === f.key && styles.filterActive]}
          >
            <Text style={[styles.filterText, status === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {listQ.isLoading ? (
        <ActivityIndicator color={colors.brand.poolBlue} style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={listQ.data ?? []}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ padding: 14, paddingBottom: 120, gap: 8 }}
          refreshControl={
            <RefreshControl
              refreshing={listQ.isFetching}
              onRefresh={() => listQ.refetch()}
              tintColor={colors.text.light}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="checkmark-done-outline" size={48} color={colors.text.secondary} />
              <Text style={styles.emptyText}>No {status} tickets</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => router.push(`/support/tickets/${item.id}`)}
            >
              <View
                style={[
                  styles.priorityBar,
                  { backgroundColor: PRIORITY_COLOR[item.priority] ?? colors.text.secondary },
                ]}
              />
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={styles.subject} numberOfLines={1}>
                  {item.subject}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {item.user?.name ?? item.user?.phone ?? "Unknown"} · {item.category ?? "general"}{" "}
                  · {item.priority}
                </Text>
                <Text style={styles.age}>{new Date(item.createdAt).toLocaleString()}</Text>
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 56,
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  hello: { color: colors.text.light, fontSize: 20, fontWeight: "700" },
  role: { color: colors.brand.poolBlue, fontSize: 11, fontWeight: "800", letterSpacing: 1.5 },
  filterRow: { flexDirection: "row", paddingHorizontal: 14, paddingBottom: 10, gap: 8 },
  filter: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  filterActive: { backgroundColor: colors.brand.poolBlue, borderColor: colors.brand.poolBlue },
  filterText: { color: colors.text.secondary, fontSize: 12, fontWeight: "700" },
  filterTextActive: { color: "#000" },
  empty: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyText: { color: colors.text.secondary, fontSize: 13 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.dark.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: 12,
    paddingLeft: 8,
  },
  priorityBar: { width: 4, alignSelf: "stretch", borderRadius: 999 },
  subject: { color: colors.text.light, fontSize: 14, fontWeight: "700" },
  meta: { color: colors.text.secondary, fontSize: 11 },
  age: { color: colors.text.secondary, fontSize: 10 },
});
