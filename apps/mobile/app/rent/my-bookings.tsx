import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Booking } from "@trendywheels/types";
import { colors, spacing, typography } from "@trendywheels/ui-tokens";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { api } from "../../lib/api";

type TabKey = "confirmed" | "completed" | "cancelled";

const TABS: { key: TabKey; label: string }[] = [
  { key: "confirmed", label: "Active" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

const STATUS_COLORS: Record<TabKey, string> = {
  confirmed: colors.primary[700],
  completed: colors.success,
  cancelled: colors.text.secondary,
};

export default function MyBookingsScreen(): JSX.Element {
  const router = useRouter();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>("confirmed");

  const { data, isLoading } = useQuery({
    queryKey: ["my-bookings", activeTab],
    queryFn: () => api.getBookings({ status: activeTab }),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.updateBooking(id, { status: "cancelled" }),
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void qc.invalidateQueries({ queryKey: ["my-bookings"] });
    },
  });

  const bookings = (data?.data ?? []) as Booking[];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.text.light} />
        </Pressable>
        <Text style={styles.title}>My Bookings</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map((t) => (
          <Pressable
            key={t.key}
            style={[styles.tab, activeTab === t.key && styles.tabActive]}
            onPress={() => setActiveTab(t.key)}
          >
            <Text style={[styles.tabText, activeTab === t.key && styles.tabTextActive]}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.accent.DEFAULT} style={{ marginTop: 40 }} size="large" />
      ) : bookings.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="calendar-outline" size={64} color={colors.text.secondary} />
          <Text style={styles.emptyText}>No {TABS.find((t) => t.key === activeTab)?.label.toLowerCase()} bookings</Text>
        </View>
      ) : (
        <FlatList<Booking>
          data={bookings}
          keyExtractor={(b) => b.id}
          contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: 100 }}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.vehicleId} numberOfLines={1}>
                    Booking #{item.id.slice(-8).toUpperCase()}
                  </Text>
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: `${STATUS_COLORS[item.status as TabKey] ?? colors.text.secondary}22` },
                    ]}
                  >
                    <Text style={[styles.badgeText, { color: STATUS_COLORS[item.status as TabKey] ?? colors.text.secondary }]}>
                      {item.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.dateRow}>
                  <View style={styles.dateItem}>
                    <Text style={styles.dateLabel}>Pickup</Text>
                    <Text style={styles.dateValue}>
                      {new Date(item.startDate).toLocaleDateString()}
                    </Text>
                  </View>
                  <Ionicons name="arrow-forward" size={16} color={colors.text.secondary} />
                  <View style={styles.dateItem}>
                    <Text style={styles.dateLabel}>Return</Text>
                    <Text style={styles.dateValue}>
                      {new Date(item.endDate).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.costItem}>
                    <Text style={styles.dateLabel}>Total</Text>
                    <Text style={styles.costValue}>{Number(item.totalCost).toLocaleString()} EGP</Text>
                  </View>
                </View>

                {item.status === "confirmed" && (
                  <Pressable
                    style={styles.cancelBtn}
                    onPress={() => cancelMutation.mutate(item.id)}
                    disabled={cancelMutation.isPending}
                  >
                    <Text style={styles.cancelBtnText}>Cancel Booking</Text>
                  </Pressable>
                )}
              </View>
            </Animated.View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 56,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    color: colors.text.light,
    fontSize: typography.fontSize.h3,
    fontWeight: typography.fontWeight.bold,
  },
  tabs: {
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  tabActive: { backgroundColor: `${colors.primary[700]}33`, borderColor: colors.primary[700] },
  tabText: { color: colors.text.secondary, fontSize: 13, fontWeight: "600" },
  tabTextActive: { color: colors.text.light },
  card: {
    backgroundColor: colors.dark.card,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.dark.border,
    gap: spacing.sm,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  vehicleId: { color: colors.text.light, fontWeight: "700", fontSize: 14, flex: 1 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.dark.border,
  },
  dateItem: { flex: 1 },
  dateLabel: { color: colors.text.secondary, fontSize: 11 },
  dateValue: { color: colors.text.light, fontWeight: "600", fontSize: 13, marginTop: 2 },
  costItem: { flex: 1, alignItems: "flex-end" },
  costValue: { color: colors.accent.DEFAULT, fontWeight: "700", fontSize: 15, marginTop: 2 },
  cancelBtn: {
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    alignItems: "center",
    marginTop: spacing.xs,
  },
  cancelBtnText: { color: colors.error, fontWeight: "600", fontSize: 14 },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", gap: spacing.md },
  emptyText: { color: colors.text.secondary, fontSize: 16 },
});
