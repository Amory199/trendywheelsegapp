import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import { Redirect } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { BackButton } from "../components/BackButton";
import { ErrorState } from "../components/ErrorState";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth-store";
import { useT } from "../lib/locale";
import { useTheme } from "../lib/use-theme";

interface CheckInBooking {
  id: string;
  startDate: string;
  endDate: string;
  totalCost: number | string;
  status: string;
  paymentStatus: string;
  paymentMethod?: string | null;
  checkedInAt?: string | null;
  user?: { name?: string; phone?: string } | null;
  vehicle?: { name?: string } | null;
}

// The pickup pass label — same derivation the customer sees under their QR
// (booking id, dashes stripped, first 6 hex, uppercased). Staff match on this.
const shortCode = (id: string): string => `TW-${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;

const money = (v: number | string): string => `EGP ${Math.round(Number(v) || 0).toLocaleString()}`;

/**
 * Staff / admin pickup check-in. Lists confirmed, not-yet-picked-up bookings;
 * staff find one by the TW-XXXXXX code (or customer/vehicle), verify the renter,
 * and confirm handover — optionally collecting cash payment at the same tap.
 * OTA-safe (no camera). A live QR camera scan rides the next native build on top
 * of the same GET /:id + POST /:id/check-in backend.
 */
export default function BookingCheckIn(): JSX.Element {
  const t = useT();
  const qc = useQueryClient();
  const { palette } = useTheme();
  const user = useAuth((s) => s.user);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<CheckInBooking | null>(null);
  const [collect, setCollect] = useState(false);

  const listQ = useQuery({
    queryKey: ["checkin", "confirmed"],
    queryFn: async (): Promise<CheckInBooking[]> => {
      const r = await api.request<{ data: CheckInBooking[] }>("GET", "/api/bookings", {
        params: { status: "confirmed", limit: 50 },
      });
      return r.data ?? [];
    },
    enabled: user?.accountType === "admin" || user?.accountType === "staff",
  });

  const checkIn = useMutation({
    mutationFn: async (vars: { id: string; collect: boolean }) =>
      api.request<{ data: CheckInBooking }>("POST", `/api/bookings/${vars.id}/check-in`, {
        body: vars.collect ? { collectPayment: true } : {},
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["checkin"] });
      void qc.invalidateQueries({ queryKey: ["admin", "bookings"] });
      setSelected(null);
      setCollect(false);
      Alert.alert(t("checkin.doneTitle"), t("checkin.doneBody"));
    },
    onError: (err) =>
      Alert.alert(t("checkin.failTitle"), err instanceof Error ? err.message : t("admin.tryAgain")),
  });

  const filtered = useMemo(() => {
    const rows = (listQ.data ?? []).filter((b) => !b.checkedInAt);
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    const qCode = q.replace(/[\s-]/g, "");
    return rows.filter((b) => {
      const code = shortCode(b.id).toLowerCase().replace(/-/g, "");
      return (
        code.includes(qCode) ||
        (b.user?.name ?? "").toLowerCase().includes(q) ||
        (b.user?.phone ?? "").includes(q) ||
        (b.vehicle?.name ?? "").toLowerCase().includes(q)
      );
    });
  }, [listQ.data, query]);

  const openConfirm = (b: CheckInBooking): void => {
    // Default the toggle ON when it's a cash booking that hasn't been paid yet.
    const unpaidCash = b.paymentStatus !== "paid" && (b.paymentMethod ?? "cash") === "cash";
    setCollect(unpaidCash);
    setSelected(b);
  };

  // Staff/admin only — a deep link could drop a customer here.
  if (user && user.accountType !== "admin" && user.accountType !== "staff") {
    return <Redirect href="/(tabs)" />;
  }

  if (listQ.isError) return <ErrorState onRetry={() => void listQ.refetch()} />;

  const selUnpaidCash =
    !!selected &&
    selected.paymentStatus !== "paid" &&
    (selected.paymentMethod ?? "cash") === "cash";

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <View style={styles.header}>
        <BackButton color={palette.text} />
        <Text style={[styles.title, { color: palette.text }]}>{t("checkin.title")}</Text>
        <View style={{ width: 32 }} />
      </View>

      <View
        style={[styles.searchWrap, { backgroundColor: palette.card, borderColor: palette.border }]}
      >
        <Ionicons name="qr-code-outline" size={18} color={palette.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t("checkin.searchPlaceholder")}
          placeholderTextColor={palette.muted}
          autoCapitalize="characters"
          autoCorrect={false}
          style={[styles.searchInput, { color: palette.text }]}
        />
        {query ? (
          <Pressable onPress={() => setQuery("")} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={palette.muted} />
          </Pressable>
        ) : null}
      </View>
      <Text style={[styles.hint, { color: palette.muted }]}>{t("checkin.hint")}</Text>

      {listQ.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand.friendlyBlue} size="large" />
        </View>
      ) : (
        <FlatList<CheckInBooking>
          data={filtered}
          keyExtractor={(b) => b.id}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 60 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={listQ.isRefetching}
              onRefresh={() => void listQ.refetch()}
              tintColor={palette.text}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="checkmark-done-circle-outline" size={56} color={palette.muted} />
              <Text style={[styles.emptyText, { color: palette.muted }]}>
                {query ? t("checkin.noMatch") : t("checkin.empty")}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const paid = item.paymentStatus === "paid";
            return (
              <Pressable
                onPress={() => openConfirm(item)}
                style={({ pressed }) => [
                  styles.card,
                  { backgroundColor: palette.card, borderColor: palette.border },
                  pressed && { opacity: 0.9 },
                ]}
              >
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={[styles.code, { color: colors.brand.friendlyBlue }]}>
                    {shortCode(item.id)}
                  </Text>
                  <Text style={[styles.cust, { color: palette.text }]}>
                    {item.user?.name || t("checkin.guest")}
                  </Text>
                  <Text style={[styles.meta, { color: palette.muted }]} numberOfLines={1}>
                    {item.vehicle?.name ?? ""} · {new Date(item.startDate).toLocaleDateString()}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 6 }}>
                  <Text style={[styles.total, { color: palette.text }]}>
                    {money(item.totalCost)}
                  </Text>
                  <View
                    style={[
                      styles.payBadge,
                      {
                        backgroundColor: paid ? "rgba(169,244,83,0.15)" : "rgba(255,0,101,0.12)",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.payText,
                        { color: paid ? colors.brand.ecoLimelight : colors.brand.trendyPink },
                      ]}
                    >
                      {paid ? t("checkin.paid") : t("checkin.unpaid")}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}

      {selected ? (
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelected(null)} />
          <View
            style={[styles.sheet, { backgroundColor: palette.card, borderColor: palette.border }]}
          >
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: palette.text }]}>
              {t("checkin.confirmTitle")}
            </Text>
            <Text style={[styles.sheetCode, { color: colors.brand.friendlyBlue }]}>
              {shortCode(selected.id)}
            </Text>

            <Row
              label={t("checkin.customer")}
              value={selected.user?.name || t("checkin.guest")}
              palette={palette}
            />
            {selected.user?.phone ? (
              <Row label={t("checkin.phone")} value={selected.user.phone} palette={palette} />
            ) : null}
            <Row
              label={t("checkin.vehicle")}
              value={selected.vehicle?.name ?? "—"}
              palette={palette}
            />
            <Row
              label={t("checkin.dates")}
              value={`${new Date(selected.startDate).toLocaleDateString()} → ${new Date(
                selected.endDate,
              ).toLocaleDateString()}`}
              palette={palette}
            />
            <Row label={t("checkin.total")} value={money(selected.totalCost)} palette={palette} />

            {selUnpaidCash ? (
              <View style={[styles.collectRow, { borderColor: palette.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.collectLabel, { color: palette.text }]}>
                    {t("checkin.collectLabel")}
                  </Text>
                  <Text style={[styles.collectSub, { color: palette.muted }]}>
                    {money(selected.totalCost)} · {t("checkin.collectSub")}
                  </Text>
                </View>
                <Switch
                  value={collect}
                  onValueChange={setCollect}
                  trackColor={{ true: colors.brand.ecoLimelight, false: palette.border }}
                />
              </View>
            ) : null}

            <Pressable
              disabled={checkIn.isPending}
              onPress={() => checkIn.mutate({ id: selected.id, collect })}
              style={({ pressed }) => [styles.confirmBtn, pressed && { opacity: 0.9 }]}
            >
              {checkIn.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="#fff" />
                  <Text style={styles.confirmText}>{t("checkin.confirmCta")}</Text>
                </>
              )}
            </Pressable>
            <Pressable onPress={() => setSelected(null)} style={styles.cancelBtn}>
              <Text style={[styles.cancelText, { color: palette.muted }]}>
                {t("checkin.cancel")}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function Row({
  label,
  value,
  palette,
}: {
  label: string;
  value: string;
  palette: { text: string; muted: string };
}): JSX.Element {
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: palette.muted }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: palette.text }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: { fontSize: 18, fontWeight: "800" },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    paddingHorizontal: 14,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 15, fontWeight: "600" },
  hint: { fontSize: 12, marginHorizontal: 18, marginTop: 8 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", gap: 12, paddingTop: 80 },
  emptyText: { fontSize: 15, fontWeight: "600", textAlign: "center", paddingHorizontal: 24 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  code: { fontSize: 12, fontWeight: "800", letterSpacing: 0.5 },
  cust: { fontSize: 16, fontWeight: "700" },
  meta: { fontSize: 12 },
  total: { fontSize: 15, fontWeight: "800" },
  payBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  payText: { fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  // Confirm sheet
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 20,
    paddingBottom: 34,
    gap: 6,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.25)",
    marginBottom: 10,
  },
  sheetTitle: { fontSize: 18, fontWeight: "800" },
  sheetCode: { fontSize: 13, fontWeight: "800", letterSpacing: 0.5, marginBottom: 8 },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    paddingVertical: 6,
  },
  detailLabel: { fontSize: 13, fontWeight: "600" },
  detailValue: { fontSize: 14, fontWeight: "700", flexShrink: 1, textAlign: "right" },
  collectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 10,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  collectLabel: { fontSize: 15, fontWeight: "700" },
  collectSub: { fontSize: 12, marginTop: 2 },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.brand.trendyPink,
    height: 52,
    borderRadius: 14,
    marginTop: 18,
  },
  confirmText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  cancelBtn: { alignItems: "center", paddingVertical: 12, marginTop: 4 },
  cancelText: { fontSize: 14, fontWeight: "700" },
});
