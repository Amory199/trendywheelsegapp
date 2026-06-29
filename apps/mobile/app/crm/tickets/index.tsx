// Staff support queue. Part of the unified staff hub (app/crm/_layout). Any
// staff member can work the support inbox: triage open tickets, pick one up,
// and resolve it. Navigates inside the staff hub so the bottom bar stays put.

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

import { BackButton } from "../../../components/BackButton";
import { api } from "../../../lib/api";
import { useT } from "../../../lib/locale";
import { useDisplay, useTracking } from "../../../lib/typography";

interface Ticket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  category?: string;
  createdAt: string;
  user?: { name?: string; phone?: string };
}

const FILTERS: Array<{ key: string; labelKey: string }> = [
  { key: "open", labelKey: "crm.tickets.filterOpen" },
  { key: "in_progress", labelKey: "crm.tickets.filterInProgress" },
  { key: "resolved", labelKey: "crm.tickets.filterResolved" },
];

const STATUS_LABEL_KEY: Record<string, string> = {
  open: "crm.tickets.filterOpen",
  in_progress: "crm.tickets.filterInProgress",
  resolved: "crm.tickets.filterResolved",
};

const PRIORITY_COLOR: Record<string, string> = {
  urgent: "#FF0000",
  high: "#FF7A00",
  medium: "#F5B800",
  low: "#7AD2FF",
};

export default function StaffTickets(): React.JSX.Element {
  const router = useRouter();
  const t = useT();
  const display = useDisplay();
  const track = useTracking();
  const [status, setStatus] = useState("open");

  const listQ = useQuery({
    queryKey: ["staff", "tickets", status],
    queryFn: async (): Promise<Ticket[]> => {
      const r = await api.getTickets({ status, limit: 50 });
      return (r.data ?? []) as unknown as Ticket[];
    },
  });

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <BackButton style={{ marginLeft: -8, marginBottom: 6 }} fallback="/crm/pipeline" />
        <Text style={[styles.kicker, { letterSpacing: track(1.5) }]}>
          {t("crm.tickets.kicker")}
        </Text>
        <Text style={[styles.title, display(0.3)]}>{t("crm.tickets.title")}</Text>
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
                {t("crm.tickets.emptyPrefix")}{" "}
                {STATUS_LABEL_KEY[status] ? t(STATUS_LABEL_KEY[status]) : status}{" "}
                {t("crm.tickets.emptySuffix")}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => router.push(`/crm/tickets/${item.id}`)}>
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
                  {item.user?.name ?? item.user?.phone ?? t("crm.tickets.unknownUser")} ·{" "}
                  {item.category ?? t("crm.tickets.generalCategory")} · {item.priority}
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
  header: { paddingTop: 72, paddingHorizontal: 18, paddingBottom: 14 },
  kicker: { color: colors.brand.poolBlue, fontSize: 11, fontWeight: "800" },
  title: {
    color: colors.text.light,
    fontSize: 28,
    textTransform: "uppercase",
    marginTop: 4,
  },
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
