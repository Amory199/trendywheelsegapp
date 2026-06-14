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
import { useT } from "../../lib/locale";
import { useTracking } from "../../lib/typography";

interface Ticket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  category?: string;
  createdAt: string;
  user?: { name?: string; phone?: string };
}

const FILTERS = [
  { key: "open", labelKey: "support.filterOpen" },
  { key: "in_progress", labelKey: "support.filterInProgress" },
  { key: "resolved", labelKey: "support.filterResolved" },
] as const;

const EMPTY_KEY = {
  open: "support.emptyOpen",
  in_progress: "support.emptyInProgress",
  resolved: "support.emptyResolved",
  closed: "support.emptyClosed",
} as const;

const PRIORITY_COLOR: Record<string, string> = {
  urgent: "#FF0000",
  high: "#FF7A00",
  medium: "#F5B800",
  low: "#7AD2FF",
};

const PRIORITY_KEY = {
  urgent: "support.priorityUrgent",
  high: "support.priorityHigh",
  medium: "support.priorityMedium",
  low: "support.priorityLow",
} as const;

export default function SupportTickets(): JSX.Element {
  const router = useRouter();
  const t = useT();
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const track = useTracking();
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
          <Text style={styles.hello}>
            {t("support.ticketsGreeting")} {user?.name?.split(" ")[0] ?? t("support.ticketsAgent")}
          </Text>
          <Text style={[styles.role, { letterSpacing: track(1.5) }]}>
            {t("support.ticketsRole")}
          </Text>
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
              {t(f.labelKey)}
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
              <Text style={styles.emptyText}>
                {t(EMPTY_KEY[status as keyof typeof EMPTY_KEY] ?? "support.emptyOpen")}
              </Text>
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
                  {item.user?.name ?? item.user?.phone ?? t("support.unknownCustomer")} ·{" "}
                  {item.category ?? t("support.generalCategory")} ·{" "}
                  {PRIORITY_KEY[item.priority as keyof typeof PRIORITY_KEY]
                    ? t(PRIORITY_KEY[item.priority as keyof typeof PRIORITY_KEY])
                    : item.priority}
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
    paddingTop: 72,
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  hello: { color: colors.text.light, fontSize: 20, fontWeight: "700" },
  role: { color: colors.brand.poolBlue, fontSize: 11, fontWeight: "800" },
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
