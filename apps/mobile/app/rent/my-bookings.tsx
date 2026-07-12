import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Booking } from "@trendywheels/types";
import { colors, spacing, typography } from "@trendywheels/ui-tokens";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ErrorState } from "../../components/ErrorState";
import { GuestGate } from "../../components/GuestGate";
import { ReviewModal } from "../../components/ReviewModal";
import { TWSkeletonCard } from "../../components/ui";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-store";
import { openContextChat } from "../../lib/context-chat";
import { useT } from "../../lib/locale";

type TabKey = "pending" | "confirmed" | "completed" | "cancelled";

// The bookings endpoint includes the vehicle relation (but not the review),
// which the base Booking type doesn't carry.
type BookingRow = Booking & {
  vehicle?: { id: string; name: string } | null;
  review?: { id: string } | null;
};

const TABS: { key: TabKey; labelKey: string }[] = [
  { key: "pending", labelKey: "rent.tabAwaiting" },
  { key: "confirmed", labelKey: "rent.tabActive" },
  { key: "completed", labelKey: "rent.tabCompleted" },
  { key: "cancelled", labelKey: "rent.tabCancelled" },
];

const STATUS_LABEL_KEYS: Record<TabKey, string> = {
  pending: "rent.statusPending",
  confirmed: "rent.statusConfirmed",
  completed: "rent.statusCompleted",
  cancelled: "rent.statusCancelled",
};

const STATUS_COLORS: Record<TabKey, string> = {
  pending: colors.warning,
  confirmed: colors.primary[700],
  completed: colors.success,
  cancelled: colors.text.secondary,
};

export default function MyBookingsScreen(): JSX.Element {
  const router = useRouter();
  const t = useT();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const user = useAuth((s) => s.user);
  const [activeTab, setActiveTab] = useState<TabKey>("pending");
  const [reviewTarget, setReviewTarget] = useState<{
    bookingId: string;
    vehicleId: string;
    vehicleName?: string;
  } | null>(null);
  // Bookings the user reviewed this session (or that 409'd as already
  // reviewed) — the list payload has no review field, so track locally.
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["my-bookings", activeTab],
    queryFn: () => api.getBookings({ status: activeTab }),
    enabled: !!user,
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.updateBooking(id, { status: "cancelled" }),
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void qc.invalidateQueries({ queryKey: ["my-bookings"] });
    },
  });

  const bookings = (data?.data ?? []) as BookingRow[];

  if (!user) return <GuestGate />;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.text.light} />
        </Pressable>
        <Text style={styles.title}>{t("rent.myBookings")}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map((tab) => (
          <Pressable
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {t(tab.labelKey)}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <View style={{ padding: spacing.md, gap: spacing.md }}>
          <TWSkeletonCard height={130} />
          <TWSkeletonCard height={130} />
          <TWSkeletonCard height={130} />
        </View>
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : bookings.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="calendar-outline" size={64} color={colors.text.secondary} />
          <Text style={styles.emptyText}>
            {t("rent.emptyBookingsPrefix")}{" "}
            {(TABS.find((tab) => tab.key === activeTab)
              ? t(TABS.find((tab) => tab.key === activeTab)!.labelKey)
              : ""
            ).toLowerCase()}{" "}
            {t("rent.emptyBookingsSuffix")}
          </Text>
        </View>
      ) : (
        <FlatList<BookingRow>
          data={bookings}
          keyExtractor={(b) => b.id}
          removeClippedSubviews
          windowSize={7}
          contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: 100 }}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.vehicleId} numberOfLines={1}>
                    {t("rent.bookingNumberPrefix")}
                    {item.id.slice(-8).toUpperCase()}
                  </Text>
                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor: `${STATUS_COLORS[item.status as TabKey] ?? colors.text.secondary}22`,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        { color: STATUS_COLORS[item.status as TabKey] ?? colors.text.secondary },
                      ]}
                    >
                      {STATUS_LABEL_KEYS[item.status as TabKey]
                        ? t(STATUS_LABEL_KEYS[item.status as TabKey])
                        : item.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.dateRow}>
                  <View style={styles.dateItem}>
                    <Text style={styles.dateLabel}>{t("rent.pickup")}</Text>
                    <Text style={styles.dateValue}>
                      {new Date(item.startDate).toLocaleDateString()}
                    </Text>
                  </View>
                  <Ionicons name="arrow-forward" size={16} color={colors.text.secondary} />
                  <View style={styles.dateItem}>
                    <Text style={styles.dateLabel}>{t("rent.returnLabel")}</Text>
                    <Text style={styles.dateValue}>
                      {new Date(item.endDate).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.costItem}>
                    <Text style={styles.dateLabel}>{t("rent.total")}</Text>
                    <Text style={styles.costValue}>
                      {Number(item.totalCost).toLocaleString()} {t("rent.currency")}
                    </Text>
                  </View>
                </View>

                {/* Per-booking thread: lands in the shared chat ABOUT this
                    booking (pinned context card), not the generic support DM. */}
                <View style={styles.actionRow}>
                  <Pressable
                    style={styles.messageBtn}
                    onPress={() =>
                      void openContextChat(router, {
                        contextType: "booking",
                        contextId: item.id,
                        contextTitle: `${item.vehicle?.name ?? t("rent.bookVehicle")} · ${item.id
                          .slice(-8)
                          .toUpperCase()}`,
                      })
                    }
                  >
                    <Ionicons name="chatbubble-outline" size={15} color={colors.text.light} />
                    <Text style={styles.messageBtnText}>{t("rent.messageBtn")}</Text>
                  </Pressable>
                  <Pressable
                    style={styles.detailsBtn}
                    onPress={() => router.push(`/rent/booking/${item.id}` as never)}
                  >
                    <Text style={styles.detailsBtnText}>{t("rent.detailsBtn")}</Text>
                    <Ionicons name="chevron-forward" size={15} color={colors.accent.DEFAULT} />
                  </Pressable>
                </View>

                {item.status === "confirmed" && (
                  <Pressable
                    style={styles.cancelBtn}
                    onPress={() => cancelMutation.mutate(item.id)}
                    disabled={cancelMutation.isPending}
                  >
                    <Text style={styles.cancelBtnText}>{t("rent.cancelBooking")}</Text>
                  </Pressable>
                )}

                {item.status === "completed" && !item.review && !reviewedIds.has(item.id) && (
                  <Pressable
                    style={styles.rateBtn}
                    onPress={() =>
                      setReviewTarget({
                        bookingId: item.id,
                        vehicleId: item.vehicleId,
                        vehicleName: item.vehicle?.name,
                      })
                    }
                  >
                    <Ionicons name="star" size={16} color="#F5B800" />
                    <Text style={styles.rateBtnText}>{t("rent.rateYourRental")}</Text>
                  </Pressable>
                )}
              </View>
            </Animated.View>
          )}
        />
      )}

      {reviewTarget && (
        <ReviewModal
          visible
          bookingId={reviewTarget.bookingId}
          vehicleId={reviewTarget.vehicleId}
          vehicleName={reviewTarget.vehicleName}
          onClose={() => setReviewTarget(null)}
          onReviewed={(bookingId) =>
            setReviewedIds((prev) => {
              const next = new Set(prev);
              next.add(bookingId);
              return next;
            })
          }
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
  rateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#F5B800",
    borderRadius: 10,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  rateBtnText: { color: "#F5B800", fontWeight: "600", fontSize: 14 },
  actionRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  messageBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.primary[700],
    borderRadius: 10,
    paddingVertical: spacing.sm,
  },
  messageBtnText: { color: colors.text.light, fontWeight: "700", fontSize: 13 },
  detailsBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: colors.dark.border,
    borderRadius: 10,
    paddingVertical: spacing.sm,
  },
  detailsBtnText: { color: colors.accent.DEFAULT, fontWeight: "700", fontSize: 13 },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", gap: spacing.md },
  emptyText: { color: colors.text.secondary, fontSize: 16 },
});
