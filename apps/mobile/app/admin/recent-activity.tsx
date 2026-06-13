import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import { Stack } from "expo-router";
import { useMemo } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "../../lib/api";

interface ActivityItem {
  id: string;
  kind: "booking" | "repair" | "listing";
  title: string;
  subtitle?: string;
  createdAt: string;
}

interface ApiData {
  bookings: Array<{
    id: string;
    createdAt: string;
    status: string;
    totalCost?: number;
    user?: { name?: string };
    vehicle?: { name?: string };
  }>;
  repairs: Array<{
    id: string;
    createdAt: string;
    category?: string;
    status: string;
    user?: { name?: string };
  }>;
  listings: Array<{ id: string; createdAt: string; title: string; status?: string }>;
}

export default function AdminRecentActivity(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const q = useQuery({
    queryKey: ["admin", "recent-activity"],
    queryFn: async () => {
      const r = await api.request<{ data: ApiData }>("GET", "/api/admin/recent-activity");
      return r.data;
    },
  });

  const items = useMemo<ActivityItem[]>(() => {
    if (!q.data) return [];
    const items: ActivityItem[] = [];
    q.data.bookings.forEach((b) =>
      items.push({
        id: `b-${b.id}`,
        kind: "booking",
        title: `Booking · ${b.vehicle?.name ?? "Vehicle"}`,
        subtitle: `${b.user?.name ?? "Customer"} · ${b.status}`,
        createdAt: b.createdAt,
      }),
    );
    q.data.repairs.forEach((r) =>
      items.push({
        id: `r-${r.id}`,
        kind: "repair",
        title: `Repair · ${r.category ?? "general"}`,
        subtitle: `${r.user?.name ?? "Customer"} · ${r.status}`,
        createdAt: r.createdAt,
      }),
    );
    q.data.listings.forEach((l) =>
      items.push({
        id: `l-${l.id}`,
        kind: "listing",
        title: `Listing · ${l.title}`,
        subtitle: l.status,
        createdAt: l.createdAt,
      }),
    );
    return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [q.data]);

  const iconFor = (kind: ActivityItem["kind"]): keyof typeof Ionicons.glyphMap => {
    if (kind === "booking") return "calendar";
    if (kind === "repair") return "construct";
    return "pricetag";
  };

  const tintFor = (kind: ActivityItem["kind"]): string => {
    if (kind === "booking") return colors.brand.friendlyBlue;
    if (kind === "repair") return "#F5B800";
    return colors.brand.trendyPink;
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: "Recent activity",
          headerStyle: { backgroundColor: colors.dark.bg },
          headerTintColor: colors.text.light,
        }}
      />
      <View style={styles.root}>
        {q.isLoading ? (
          <ActivityIndicator color={colors.brand.poolBlue} style={{ marginTop: 40 }} size="large" />
        ) : (
          <ScrollView
            contentContainerStyle={{
              padding: 14,
              paddingTop: insets.top + 14,
              paddingBottom: 120,
              gap: 10,
            }}
            refreshControl={
              <RefreshControl
                refreshing={q.isFetching}
                onRefresh={() => q.refetch()}
                tintColor={colors.text.light}
              />
            }
          >
            {items.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="time-outline" size={48} color={colors.text.secondary} />
                <Text style={styles.emptyText}>No recent activity</Text>
              </View>
            ) : (
              items.map((it) => (
                <View key={it.id} style={styles.row}>
                  <View style={[styles.icon, { backgroundColor: tintFor(it.kind) + "22" }]}>
                    <Ionicons name={iconFor(it.kind)} size={18} color={tintFor(it.kind)} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.title} numberOfLines={1}>
                      {it.title}
                    </Text>
                    <Text style={styles.subtitle}>{it.subtitle}</Text>
                  </View>
                  <Text style={styles.time}>{new Date(it.createdAt).toLocaleString()}</Text>
                </View>
              ))
            )}
          </ScrollView>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.dark.bg },
  empty: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyText: { color: colors.text.secondary, fontSize: 13 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.dark.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: 12,
  },
  icon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  title: { color: colors.text.light, fontSize: 13, fontWeight: "700" },
  subtitle: { color: colors.text.secondary, fontSize: 11, textTransform: "capitalize" },
  time: { color: colors.text.secondary, fontSize: 10 },
});
