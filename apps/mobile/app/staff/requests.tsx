import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import { Redirect, router } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { BackButton } from "../../components/BackButton";
import { ErrorState } from "../../components/ErrorState";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-store";
import { useT } from "../../lib/locale";
import { useTheme } from "../../lib/use-theme";

type RequestType = "bookings" | "listings" | "service" | "reservations" | "orders" | "tradeins";

type ServiceKind = "maintenance" | "customization" | "transport";

// One normalised shape so the list, the badges and the action bar don't each
// need to know which backend the row came from.
interface RequestRow {
  id: string;
  type: RequestType;
  customer: string;
  label: string;
  detail: string;
  amount: string;
  date: string;
  serviceKind?: ServiceKind;
}

interface ApiUser {
  name?: string | null;
  phone?: string | null;
}

const money = (v: number | string | null | undefined): string =>
  v === null || v === undefined ? "" : `EGP ${Math.round(Number(v) || 0).toLocaleString()}`;

const day = (v: string | Date | null | undefined): string =>
  v ? new Date(v).toLocaleDateString() : "";

export default function StaffRequests(): JSX.Element {
  const t = useT();
  const qc = useQueryClient();
  const { palette } = useTheme();
  const user = useAuth((s) => s.user);
  const isStaff = user?.accountType === "admin" || user?.accountType === "staff";
  const isAdmin = user?.accountType === "admin";
  const [type, setType] = useState<RequestType>("bookings");
  // Reject reasons and trade-in quotes both need free text; Alert.prompt is
  // iOS-only, so one in-app sheet serves both.
  const [prompt, setPrompt] = useState<{ row: RequestRow; mode: "reject" | "quote" } | null>(null);
  const [promptText, setPromptText] = useState("");

  const customerOf = (u: ApiUser | null | undefined): string =>
    u?.name || u?.phone || t("ops.customerFallback");

  const bookingsQ = useQuery({
    queryKey: ["staff-requests", "bookings"],
    enabled: isStaff,
    queryFn: async (): Promise<RequestRow[]> => {
      const r = await api.request<{
        data: Array<{
          id: string;
          startDate: string;
          totalCost: number | string;
          user?: ApiUser | null;
          vehicle?: { name?: string } | null;
        }>;
      }>("GET", "/api/bookings", { params: { status: "pending", limit: 100 } });
      return (r.data ?? []).map((b) => ({
        id: b.id,
        type: "bookings",
        customer: customerOf(b.user),
        label: t("ops.labelBooking"),
        detail: b.vehicle?.name ?? "",
        amount: money(b.totalCost),
        date: day(b.startDate),
      }));
    },
  });

  const listingsQ = useQuery({
    queryKey: ["staff-requests", "listings"],
    enabled: isStaff,
    queryFn: async (): Promise<RequestRow[]> => {
      const r = await api.request<{
        data: Array<{
          id: string;
          brand: string;
          model: string;
          year: number;
          status: string;
          dailyRateEgp?: number | string | null;
          createdAt: string;
          user?: ApiUser | null;
        }>;
      }>("GET", "/api/rental-listings/admin/all");
      return (r.data ?? [])
        .filter((l) => l.status === "submitted")
        .map((l) => ({
          id: l.id,
          type: "listings",
          customer: customerOf(l.user),
          label: t("ops.labelListing"),
          detail: `${l.brand} ${l.model} ${l.year}`,
          amount: money(l.dailyRateEgp),
          date: day(l.createdAt),
        }));
    },
  });

  const serviceQ = useQuery({
    queryKey: ["staff-requests", "service"],
    enabled: isStaff,
    queryFn: async (): Promise<RequestRow[]> => {
      const [maint, custom, transport] = await Promise.all([
        api.request<{
          data: Array<{
            id: string;
            serviceType: string;
            preferredDate: string;
            estimatedCost?: number | string | null;
            user?: ApiUser | null;
          }>;
        }>("GET", "/api/service/maintenance", { params: { status: "submitted" } }),
        api.request<{
          data: Array<{
            id: string;
            kind: string;
            budget?: number | string | null;
            createdAt: string;
            user?: ApiUser | null;
          }>;
        }>("GET", "/api/service/customization", { params: { status: "submitted" } }),
        api.request<{
          data: Array<{
            id: string;
            fromAddress: string;
            toAddress: string;
            pickupAt: string;
            priceEgp?: number | string | null;
            user?: ApiUser | null;
          }>;
        }>("GET", "/api/service/transport", { params: { status: "submitted" } }),
      ]);
      return [
        ...(maint.data ?? []).map(
          (m): RequestRow => ({
            id: m.id,
            type: "service",
            serviceKind: "maintenance",
            customer: customerOf(m.user),
            label: t("ops.labelMaintenance"),
            detail: m.serviceType,
            amount: money(m.estimatedCost),
            date: day(m.preferredDate),
          }),
        ),
        ...(custom.data ?? []).map(
          (c): RequestRow => ({
            id: c.id,
            type: "service",
            serviceKind: "customization",
            customer: customerOf(c.user),
            label: t("ops.labelCustomization"),
            detail: c.kind,
            amount: money(c.budget),
            date: day(c.createdAt),
          }),
        ),
        ...(transport.data ?? []).map(
          (p): RequestRow => ({
            id: p.id,
            type: "service",
            serviceKind: "transport",
            customer: customerOf(p.user),
            label: t("ops.labelTransport"),
            detail: `${p.fromAddress} → ${p.toAddress}`,
            amount: money(p.priceEgp),
            date: day(p.pickupAt),
          }),
        ),
      ];
    },
  });

  const reservationsQ = useQuery({
    queryKey: ["staff-requests", "reservations"],
    enabled: isStaff,
    queryFn: async (): Promise<RequestRow[]> => {
      const r = await api.request<{
        data: Array<{
          id: string;
          status: string;
          amountEgp: number | string;
          createdAt: string;
          user?: ApiUser | null;
          vehicle?: { name?: string } | null;
        }>;
      }>("GET", "/api/reservations");
      return (r.data ?? [])
        .filter((v) => v.status === "pending")
        .map((v) => ({
          id: v.id,
          type: "reservations",
          customer: customerOf(v.user),
          label: t("ops.labelReservation"),
          detail: v.vehicle?.name ?? "",
          amount: money(v.amountEgp),
          date: day(v.createdAt),
        }));
    },
  });

  const ordersQ = useQuery({
    queryKey: ["staff-requests", "orders"],
    enabled: isStaff,
    queryFn: async (): Promise<RequestRow[]> => {
      const r = await api.request<{
        data: Array<{
          id: string;
          status: string;
          stage?: string | null;
          totalEgp: number | string;
          createdAt: string;
          items?: Array<{ product?: { name?: string } | null }> | null;
          user?: ApiUser | null;
        }>;
      }>("GET", "/api/orders/admin/all");
      // Filter on STAGE, not status: approving an order advances its stage but
      // deliberately leaves status "pending" (there is no "confirmed" order
      // status). Filtering on status left the approved row in the list with a
      // live Approve button that 409'd on the second tap.
      return (r.data ?? [])
        .filter((o) => (o.stage ?? "requested") === "requested" && o.status !== "cancelled")
        .map((o) => ({
          id: o.id,
          type: "orders",
          customer: customerOf(o.user),
          label: t("ops.labelOrder"),
          detail: (o.items ?? [])
            .map((i) => i.product?.name ?? "")
            .filter(Boolean)
            .join(", "),
          amount: money(o.totalEgp),
          date: day(o.createdAt),
        }));
    },
  });

  // GET /api/trade-in/admin/all is still admin-only server-side, so the tab is
  // hidden from staff rather than showing them a guaranteed 403.
  const tradeInsQ = useQuery({
    queryKey: ["staff-requests", "tradeins"],
    enabled: isAdmin,
    queryFn: async (): Promise<RequestRow[]> => {
      const r = await api.request<{
        data: Array<{
          id: string;
          brand: string;
          model: string;
          year: number;
          condition: string;
          status: string;
          createdAt: string;
          user?: ApiUser | null;
        }>;
      }>("GET", "/api/trade-in/admin/all");
      return (r.data ?? [])
        .filter((q) => q.status === "submitted")
        .map((q) => ({
          id: q.id,
          type: "tradeins",
          customer: customerOf(q.user),
          label: t("ops.labelTradeIn"),
          detail: `${q.brand} ${q.model} ${q.year} · ${q.condition}`,
          amount: "",
          date: day(q.createdAt),
        }));
    },
  });

  const queries = {
    bookings: bookingsQ,
    listings: listingsQ,
    service: serviceQ,
    reservations: reservationsQ,
    orders: ordersQ,
    tradeins: tradeInsQ,
  } as const;

  const tabs = useMemo(() => {
    const all: Array<{ key: RequestType; label: string }> = [
      { key: "bookings", label: t("ops.tabBookings") },
      { key: "listings", label: t("ops.tabListings") },
      { key: "service", label: t("ops.tabService") },
      { key: "reservations", label: t("ops.tabReservations") },
      { key: "orders", label: t("ops.tabOrders") },
      { key: "tradeins", label: t("ops.tabTradeIns") },
    ];
    return isAdmin ? all : all.filter((tab) => tab.key !== "tradeins");
  }, [isAdmin, t]);

  const active = queries[type];
  const rows = active.data ?? [];

  const decide = useMutation({
    mutationFn: async (vars: { row: RequestRow; approve: boolean; text?: string }) => {
      const { row, approve, text } = vars;
      switch (row.type) {
        case "bookings":
          return approve ? api.approveBooking(row.id) : api.rejectBooking(row.id, text);
        case "listings":
          return api.request("PATCH", `/api/rental-listings/${row.id}`, {
            body: approve ? { status: "approved" } : { status: "declined", declineReason: text },
          });
        case "service":
          return api.request("PATCH", `/api/service/${row.serviceKind}/${row.id}`, {
            body: { status: approve ? "assigned" : "cancelled" },
          });
        case "reservations":
          return api.request("PATCH", `/api/reservations/${row.id}`, {
            body: { status: approve ? "confirmed" : "cancelled" },
          });
        case "orders":
          return approve
            ? api.request("POST", `/api/orders/${row.id}/stage`, { body: { stage: "approved" } })
            : api.request("POST", `/api/orders/${row.id}/status`, {
                body: { status: "cancelled" },
              });
        case "tradeins":
          return api.request("POST", `/api/trade-in/${row.id}/quote`, {
            body: approve
              ? { quoteEgp: Number(text), status: "quoted" }
              : { quoteEgp: 0, status: "rejected" },
          });
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["staff-requests"] });
      void qc.invalidateQueries({ queryKey: ["admin", "bookings"] });
      closePrompt();
      Alert.alert(t("ops.actionDoneTitle"), t("ops.actionDoneBody"));
    },
    onError: (err) =>
      Alert.alert(
        t("ops.actionFailTitle"),
        err instanceof Error ? err.message : t("ops.actionFailBody"),
      ),
  });

  const closePrompt = (): void => {
    setPrompt(null);
    setPromptText("");
  };

  const onApprove = (row: RequestRow): void => {
    // A trade-in is only "approved" once staff attach a price to it.
    if (row.type === "tradeins") {
      setPromptText("");
      setPrompt({ row, mode: "quote" });
      return;
    }
    decide.mutate({ row, approve: true });
  };

  const onReject = (row: RequestRow): void => {
    // Only these two endpoints persist a reason — elsewhere asking for one
    // would throw the text away.
    if (row.type === "bookings" || row.type === "listings") {
      setPromptText("");
      setPrompt({ row, mode: "reject" });
      return;
    }
    decide.mutate({ row, approve: false });
  };

  const submitPrompt = (): void => {
    if (!prompt) return;
    if (prompt.mode === "quote") {
      const value = Number(promptText);
      if (!Number.isFinite(value) || value <= 0) {
        Alert.alert(t("ops.quoteInvalidTitle"), t("ops.quoteInvalidBody"));
        return;
      }
      decide.mutate({ row: prompt.row, approve: true, text: promptText });
      return;
    }
    decide.mutate({ row: prompt.row, approve: false, text: promptText.trim() || undefined });
  };

  const openRow = (row: RequestRow): void => {
    if (row.type === "bookings") router.push(`/staff/pipeline/booking/${row.id}`);
    else if (row.type === "orders") router.push(`/staff/pipeline/order/${row.id}`);
  };

  // Staff/admin only — a deep link could drop a customer here.
  if (user && !isStaff) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <View style={styles.header}>
        <BackButton color={palette.text} />
        <Text style={[styles.title, { color: palette.text }]}>{t("ops.requestsTitle")}</Text>
        <View style={{ width: 32 }} />
      </View>
      <Text style={[styles.hint, { color: palette.muted }]}>{t("ops.requestsSubtitle")}</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabRow}
      >
        {tabs.map((tab) => {
          const on = tab.key === type;
          const count = queries[tab.key].data?.length ?? 0;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setType(tab.key)}
              style={[
                styles.tab,
                { borderColor: palette.border, backgroundColor: palette.card },
                on && { backgroundColor: colors.brand.trendyPink, borderColor: "transparent" },
              ]}
            >
              <Text style={[styles.tabText, { color: on ? "#fff" : palette.text }]}>
                {tab.label}
              </Text>
              {count > 0 ? (
                <View style={[styles.badge, on && { backgroundColor: "rgba(255,255,255,0.28)" }]}>
                  <Text style={[styles.badgeText, on && { color: "#fff" }]}>{count}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>

      {active.isError ? (
        <ErrorState onRetry={() => void active.refetch()} />
      ) : active.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand.friendlyBlue} size="large" />
        </View>
      ) : (
        <FlatList<RequestRow>
          data={rows}
          keyExtractor={(r) => `${r.type}-${r.serviceKind ?? ""}-${r.id}`}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 60 }}
          refreshControl={
            <RefreshControl
              refreshing={active.isRefetching}
              onRefresh={() => void active.refetch()}
              tintColor={palette.text}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="checkmark-done-circle-outline" size={56} color={palette.muted} />
              <Text style={[styles.emptyText, { color: palette.muted }]}>{t("ops.empty")}</Text>
            </View>
          }
          renderItem={({ item }) => {
            const tappable = item.type === "bookings" || item.type === "orders";
            return (
              <Pressable
                onPress={tappable ? () => openRow(item) : undefined}
                style={({ pressed }) => [
                  styles.card,
                  { backgroundColor: palette.card, borderColor: palette.border },
                  tappable && pressed && { opacity: 0.9 },
                ]}
              >
                <View style={styles.cardTop}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={[styles.label, { color: colors.brand.friendlyBlue }]}>
                      {item.label}
                    </Text>
                    <Text style={[styles.cust, { color: palette.text }]} numberOfLines={1}>
                      {item.customer}
                    </Text>
                    {item.detail ? (
                      <Text style={[styles.meta, { color: palette.muted }]} numberOfLines={1}>
                        {item.detail}
                      </Text>
                    ) : null}
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 4 }}>
                    {item.amount ? (
                      <Text style={[styles.total, { color: palette.text }]}>{item.amount}</Text>
                    ) : null}
                    <Text style={[styles.meta, { color: palette.muted }]}>{item.date}</Text>
                    {tappable ? (
                      <Ionicons name="chevron-forward" size={16} color={palette.muted} />
                    ) : null}
                  </View>
                </View>

                <View style={[styles.actions, { borderColor: palette.border }]}>
                  <Pressable
                    disabled={decide.isPending}
                    onPress={() => onReject(item)}
                    style={({ pressed }) => [
                      styles.actionBtn,
                      { borderColor: palette.border },
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <Ionicons name="close" size={16} color={colors.brand.trendyPink} />
                    <Text style={[styles.actionText, { color: colors.brand.trendyPink }]}>
                      {t("ops.reject")}
                    </Text>
                  </Pressable>
                  <Pressable
                    disabled={decide.isPending}
                    onPress={() => onApprove(item)}
                    style={({ pressed }) => [
                      styles.actionBtn,
                      styles.approveBtn,
                      pressed && { opacity: 0.9 },
                    ]}
                  >
                    <Ionicons name="checkmark" size={16} color="#fff" />
                    <Text style={[styles.actionText, { color: "#fff" }]}>{t("ops.approve")}</Text>
                  </Pressable>
                </View>
              </Pressable>
            );
          }}
        />
      )}

      {prompt ? (
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closePrompt} />
          <View
            style={[styles.sheet, { backgroundColor: palette.card, borderColor: palette.border }]}
          >
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: palette.text }]}>
              {prompt.mode === "quote" ? t("ops.quoteTitle") : t("ops.rejectReasonTitle")}
            </Text>
            <Text style={[styles.meta, { color: palette.muted }]}>{prompt.row.customer}</Text>
            <TextInput
              value={promptText}
              onChangeText={setPromptText}
              placeholder={
                prompt.mode === "quote"
                  ? t("ops.quotePlaceholder")
                  : t("ops.rejectReasonPlaceholder")
              }
              placeholderTextColor={palette.muted}
              keyboardType={prompt.mode === "quote" ? "number-pad" : "default"}
              multiline={prompt.mode === "reject"}
              style={[
                styles.promptInput,
                { color: palette.text, borderColor: palette.border },
                prompt.mode === "reject" && { height: 96, textAlignVertical: "top" },
              ]}
            />
            <Pressable
              disabled={decide.isPending}
              onPress={submitPrompt}
              style={({ pressed }) => [styles.confirmBtn, pressed && { opacity: 0.9 }]}
            >
              {decide.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.confirmText}>{t("ops.promptSubmit")}</Text>
              )}
            </Pressable>
            <Pressable onPress={closePrompt} style={styles.cancelBtn}>
              <Text style={[styles.cancelText, { color: palette.muted }]}>
                {t("ops.promptCancel")}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}
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
  hint: { fontSize: 12, marginHorizontal: 18 },
  tabRow: { gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
  },
  tabText: { fontSize: 13, fontWeight: "700" },
  badge: {
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 999,
    backgroundColor: "rgba(255,0,101,0.15)",
    alignItems: "center",
  },
  badgeText: { fontSize: 11, fontWeight: "800", color: colors.brand.trendyPink },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", gap: 12, paddingTop: 80 },
  emptyText: { fontSize: 15, fontWeight: "600", textAlign: "center", paddingHorizontal: 24 },
  card: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 12 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  label: { fontSize: 11, fontWeight: "800", letterSpacing: 0.5, textTransform: "uppercase" },
  cust: { fontSize: 16, fontWeight: "700" },
  meta: { fontSize: 12 },
  total: { fontSize: 15, fontWeight: "800" },
  actions: { flexDirection: "row", gap: 10, paddingTop: 12, borderTopWidth: 1 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
  },
  approveBtn: { backgroundColor: colors.brand.trendyPink, borderColor: "transparent" },
  actionText: { fontSize: 13, fontWeight: "800" },
  // Reason / quote sheet
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
    gap: 8,
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
  promptInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: "600",
    marginTop: 6,
  },
  confirmBtn: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brand.trendyPink,
    height: 52,
    borderRadius: 14,
    marginTop: 12,
  },
  confirmText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  cancelBtn: { alignItems: "center", paddingVertical: 12 },
  cancelText: { fontSize: 14, fontWeight: "700" },
});
