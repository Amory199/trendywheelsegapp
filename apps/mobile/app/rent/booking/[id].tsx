// Booking detail — the tappable "Details" behind each My Bookings card.
// Shows the pickup pass (QR + short code), dates, payment method, and total,
// with Message / Add-to-calendar actions. Reads the booking from the user's
// own list (there is no public GET /bookings/:id).
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import type { Booking } from "@trendywheels/types";
import { colors, spacing } from "@trendywheels/ui-tokens";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";

import { BackButton } from "../../../components/BackButton";
import { ErrorState } from "../../../components/ErrorState";
import { GuestGate } from "../../../components/GuestGate";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/auth-store";
import { openContextChat } from "../../../lib/context-chat";
import { useT } from "../../../lib/locale";

type BookingRow = Booking & {
  vehicle?: { id: string; name: string } | null;
  paymentMethod?: string;
};

export default function BookingDetail(): JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const t = useT();
  const user = useAuth((s) => s.user);

  const q = useQuery({
    queryKey: ["bookings", "mine-all"],
    queryFn: () => api.getBookings({ limit: 100 }),
    enabled: !!user,
  });
  const booking = ((q.data?.data ?? []) as BookingRow[]).find((b) => b.id === id);

  if (!user) return <GuestGate />;

  const shortCode = id ? `TW-${id.replace(/-/g, "").slice(0, 6).toUpperCase()}` : "";

  const addToCalendar = (): void => {
    if (!booking) return;
    const fmt = (d: string): string => d.slice(0, 10).replace(/-/g, "");
    const end = new Date(booking.endDate);
    end.setDate(end.getDate() + 1);
    const url =
      "https://calendar.google.com/calendar/render?action=TEMPLATE" +
      `&text=${encodeURIComponent(`TrendyWheels · ${booking.vehicle?.name ?? ""}`)}` +
      `&dates=${fmt(String(booking.startDate))}/${fmt(end.toISOString())}` +
      `&details=${encodeURIComponent(shortCode)}`;
    void Linking.openURL(url);
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.body}>
        <BackButton fallback="/rent/my-bookings" />
        {q.isLoading ? (
          <ActivityIndicator color={colors.accent.DEFAULT} style={{ marginTop: 60 }} />
        ) : q.isError ? (
          // Distinct from "not found": a failed/offline fetch must offer a
          // retry, not falsely claim the booking doesn't exist.
          <ErrorState onRetry={() => void q.refetch()} />
        ) : !booking ? (
          <Text style={styles.missing}>{t("rent.bookingNotFound")}</Text>
        ) : (
          <>
            <Text style={styles.title} numberOfLines={2}>
              {booking.vehicle?.name ?? t("rent.bookVehicle")}
            </Text>
            <Text style={styles.status}>
              {String(booking.status).toUpperCase()} · {shortCode}
            </Text>

            <View style={styles.qrCard}>
              <View style={styles.qrWrap}>
                <QRCode value={booking.id} size={160} backgroundColor="transparent" />
              </View>
              <Text style={styles.qrHint}>{t("rent.showAtPickup")}</Text>
            </View>

            <View style={styles.infoCard}>
              <Row
                label={t("rent.pickup")}
                value={new Date(booking.startDate).toLocaleDateString()}
              />
              <Row
                label={t("rent.returnLabel")}
                value={new Date(booking.endDate).toLocaleDateString()}
              />
              <Row
                label={t("rent.paymentMethod")}
                value={
                  booking.paymentMethod === "card"
                    ? t("rent.creditDebitCard")
                    : t("rent.cashOnPickup")
                }
              />
              <Row
                label={t("rent.total")}
                value={`${Number(booking.totalCost).toLocaleString()} ${t("rent.currency")}`}
                strong
              />
            </View>

            <View style={styles.actions}>
              <Pressable
                style={styles.primaryBtn}
                onPress={() =>
                  void openContextChat(router, {
                    contextType: "booking",
                    contextId: booking.id,
                    contextTitle: `${booking.vehicle?.name ?? ""} · ${shortCode}`,
                  })
                }
              >
                <Ionicons name="chatbubble-outline" size={16} color="#000" />
                <Text style={styles.primaryBtnText}>{t("rent.messageBtn")}</Text>
              </Pressable>
              <Pressable style={styles.secondaryBtn} onPress={addToCalendar}>
                <Ionicons name="calendar-outline" size={16} color={colors.text.light} />
                <Text style={styles.secondaryBtnText}>{t("rent.addToCalendar")}</Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}): JSX.Element {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, strong && styles.rowValueStrong]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.dark.bg },
  body: { padding: spacing.lg, paddingTop: 64, paddingBottom: 60, gap: spacing.md },
  missing: { color: colors.text.secondary, textAlign: "center", marginTop: 60 },
  title: { color: colors.text.light, fontSize: 24, fontWeight: "800", marginTop: spacing.sm },
  status: { color: colors.accent.DEFAULT, fontSize: 13, fontWeight: "700" },
  qrCard: {
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.dark.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: spacing.lg,
  },
  qrWrap: { backgroundColor: "#fff", padding: spacing.md, borderRadius: 14 },
  qrHint: { color: colors.text.secondary, fontSize: 12 },
  infoCard: {
    backgroundColor: colors.dark.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowLabel: { color: colors.text.secondary, fontSize: 13 },
  rowValue: { color: colors.text.light, fontSize: 14, fontWeight: "600" },
  rowValueStrong: { color: colors.accent.DEFAULT, fontSize: 16, fontWeight: "800" },
  actions: { flexDirection: "row", gap: spacing.sm },
  primaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.accent.DEFAULT,
    borderRadius: 12,
    paddingVertical: 14,
  },
  primaryBtnText: { color: "#000", fontWeight: "800", fontSize: 14 },
  secondaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.dark.border,
    borderRadius: 12,
    paddingVertical: 14,
  },
  secondaryBtnText: { color: colors.text.light, fontWeight: "700", fontSize: 14 },
});
