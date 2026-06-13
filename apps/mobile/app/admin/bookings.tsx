import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { api } from "../../lib/api";
import { useT } from "../../lib/locale";

interface AdminBooking {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  totalCost: string | number;
  vehicle?: { name: string };
  user?: { name?: string; phone?: string };
}

const FILTERS: Array<{
  key: string;
  labelKey:
    | "admin.bookingFilterPending"
    | "admin.bookingFilterConfirmed"
    | "admin.bookingFilterCompleted"
    | "admin.bookingFilterCancelled";
}> = [
  { key: "pending", labelKey: "admin.bookingFilterPending" },
  { key: "confirmed", labelKey: "admin.bookingFilterConfirmed" },
  { key: "completed", labelKey: "admin.bookingFilterCompleted" },
  { key: "cancelled", labelKey: "admin.bookingFilterCancelled" },
];

export default function AdminBookings(): JSX.Element {
  const [status, setStatus] = useState("pending");
  const qc = useQueryClient();
  const t = useT();

  const listQ = useQuery({
    queryKey: ["admin", "bookings", status],
    queryFn: async (): Promise<AdminBooking[]> => {
      const r = await api.adminListBookings(status);
      return (r.data ?? []) as AdminBooking[];
    },
  });

  const approve = useMutation({
    mutationFn: async (id: string) => api.approveBooking(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "bookings"] }),
    onError: (err) =>
      Alert.alert(
        t("admin.approveFailed"),
        err instanceof Error ? err.message : t("admin.tryAgain"),
      ),
  });

  const reject = useMutation({
    mutationFn: async (id: string) => api.rejectBooking(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "bookings"] }),
    onError: (err) =>
      Alert.alert(
        t("admin.rejectFailed"),
        err instanceof Error ? err.message : t("admin.tryAgain"),
      ),
  });

  const filterLabel = (key: string): string => {
    const f = FILTERS.find((x) => x.key === key);
    return f ? t(f.labelKey) : key;
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("admin.bookingsTitle")}</Text>
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
        <ActivityIndicator color={colors.brand.friendlyBlue} style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={listQ.data ?? []}
          keyExtractor={(b) => b.id}
          contentContainerStyle={{ padding: 14, paddingBottom: 120, gap: 10 }}
          refreshControl={
            <RefreshControl
              refreshing={listQ.isFetching}
              onRefresh={() => listQ.refetch()}
              tintColor={colors.text.light}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="checkmark-circle-outline" size={48} color={colors.text.secondary} />
              <Text style={styles.emptyText}>
                {t("admin.bookingsEmptyPrefix")}
                {filterLabel(status)}
                {t("admin.bookingsEmptySuffix")}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.cardTitle}>
                  {item.vehicle?.name ?? t("admin.bookingVehicleFallback")}
                </Text>
                <Text style={styles.cardCustomer}>
                  {item.user?.name ?? item.user?.phone ?? t("admin.bookingCustomerFallback")}
                </Text>
                <Text style={styles.cardDates}>
                  {new Date(item.startDate).toLocaleDateString()} →{" "}
                  {new Date(item.endDate).toLocaleDateString()}
                </Text>
                <Text style={styles.cardCost}>
                  {t("admin.egp")} {Number(item.totalCost).toLocaleString()}
                </Text>
              </View>
              {status === "pending" && (
                <View style={{ gap: 6 }}>
                  <Pressable
                    onPress={() => approve.mutate(item.id)}
                    style={[styles.btn, styles.btnApprove]}
                    disabled={approve.isPending}
                  >
                    <Ionicons name="checkmark" size={16} color="#000" />
                    <Text style={styles.btnApproveText}>{t("admin.approve")}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() =>
                      Alert.alert(t("admin.rejectBookingTitle"), t("admin.rejectBookingMessage"), [
                        { text: t("common.cancel") },
                        {
                          text: t("admin.reject"),
                          style: "destructive",
                          onPress: () => reject.mutate(item.id),
                        },
                      ])
                    }
                    style={[styles.btn, styles.btnReject]}
                    disabled={reject.isPending}
                  >
                    <Ionicons name="close" size={16} color="#fff" />
                    <Text style={styles.btnRejectText}>{t("admin.reject")}</Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.dark.bg },
  header: { paddingTop: 72, paddingHorizontal: 18, paddingBottom: 10 },
  title: { color: colors.text.light, fontSize: 24, fontWeight: "700" },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingBottom: 12,
    gap: 8,
    flexWrap: "wrap",
  },
  filter: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  filterActive: {
    backgroundColor: colors.brand.friendlyBlue,
    borderColor: colors.brand.friendlyBlue,
  },
  filterText: { color: colors.text.secondary, fontSize: 12, fontWeight: "700" },
  filterTextActive: { color: "#fff" },
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
  cardTitle: { color: colors.text.light, fontSize: 15, fontWeight: "700" },
  cardCustomer: { color: colors.text.secondary, fontSize: 12 },
  cardDates: { color: colors.text.secondary, fontSize: 12 },
  cardCost: { color: colors.brand.trendyPink, fontWeight: "700", marginTop: 2 },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnApprove: { backgroundColor: colors.brand.ecoLimelight ?? "#A9F453" },
  btnApproveText: { color: "#000", fontSize: 12, fontWeight: "700" },
  btnReject: { backgroundColor: colors.brand.trendyPink },
  btnRejectText: { color: "#fff", fontSize: 12, fontWeight: "700" },
});
