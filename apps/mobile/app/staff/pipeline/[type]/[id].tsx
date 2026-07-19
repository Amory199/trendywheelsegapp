import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BOOKING_STAGES,
  ORDER_STAGES,
  stageIndex,
  type BookingStage,
  type OrderStage,
  type StageEvent,
} from "@trendywheels/types";
import { colors } from "@trendywheels/ui-tokens";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { BackButton } from "../../../../components/BackButton";
import { ErrorState } from "../../../../components/ErrorState";
import { api } from "../../../../lib/api";
import { useAuth } from "../../../../lib/auth-store";
import { openContextChat } from "../../../../lib/context-chat";
import { useT } from "../../../../lib/locale";
import { useTheme } from "../../../../lib/use-theme";

type PipelineType = "booking" | "order";

interface PipelineParty {
  id?: string;
  name?: string | null;
  phone?: string | null;
}

interface PipelineBooking {
  id: string;
  stage?: string;
  status: string;
  paymentStatus: string;
  totalCost: number | string;
  startDate: string;
  endDate: string;
  user?: PipelineParty | null;
  vehicle?: { name?: string | null } | null;
}

interface PipelineOrder {
  id: string;
  stage?: string;
  status: string;
  totalEgp: number | string;
  createdAt: string;
  user?: PipelineParty | null;
  items?: Array<{ id: string; quantity: number; product?: { name?: string | null } | null }>;
}

// Same derivation the customer sees under their QR pass and the check-in
// screen matches on (id, dashes stripped, first 6 hex, uppercased).
const shortCode = (id: string): string => `TW-${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;

const money = (v: number | string): string => `EGP ${Math.round(Number(v) || 0).toLocaleString()}`;

const STAGE_LABEL_KEY: Record<string, string> = {
  requested: "ops.stage.requested",
  approved: "ops.stage.approved",
  customer_confirmed: "ops.stage.customerConfirmed",
  payment_collected: "ops.stage.paymentCollected",
  handed_over: "ops.stage.handedOver",
  returned: "ops.stage.returned",
  delivered: "ops.stage.delivered",
  closed: "ops.stage.closed",
};

/**
 * Staff fulfilment pipeline — walk one booking or order through the five
 * owner-approved stages. Mirrors the CRM lead board's "move stage" chip row so
 * sales agents meet the same interaction twice. Movement is forward-only: the
 * server rejects a rewind (stages fire one-way side effects), so past stages
 * are rendered as done rather than offered as taps.
 *
 * Lives at root level, not under app/admin/ — that layout hard-redirects any
 * non-admin and sales agents fulfil orders too.
 */
export default function StagePipeline(): JSX.Element {
  const t = useT();
  const qc = useQueryClient();
  const router = useRouter();
  const { palette } = useTheme();
  const me = useAuth((s) => s.user);
  const { type, id } = useLocalSearchParams<{ type: string; id: string }>();
  const [pendingStage, setPendingStage] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const isStaff = me?.accountType === "admin" || me?.accountType === "staff";
  const isBooking = type === "booking";
  const stages: readonly string[] = isBooking ? BOOKING_STAGES : ORDER_STAGES;
  const enabled = isStaff && !!id && (type === "booking" || type === "order");

  const entityQ = useQuery({
    queryKey: ["staff-pipeline", type, id],
    queryFn: async (): Promise<PipelineBooking | PipelineOrder> => {
      const r = isBooking
        ? await api.getBooking(id!)
        : ((await api.getOrder(id!)) as { data: unknown });
      return r.data as PipelineBooking | PipelineOrder;
    },
    enabled,
  });

  const eventsQ = useQuery({
    queryKey: ["staff-pipeline", type, id, "events"],
    queryFn: async (): Promise<StageEvent[]> => {
      const r = isBooking
        ? await api.getBookingStageEvents(id!)
        : await api.getOrderStageEvents(id!);
      return r.data ?? [];
    },
    enabled,
  });

  const advance = useMutation({
    mutationFn: async (vars: { stage: string; note: string }) =>
      isBooking
        ? api.advanceBookingStage(id!, vars.stage as BookingStage, vars.note || undefined)
        : api.advanceOrderStage(id!, vars.stage as OrderStage, vars.note || undefined),
    onSuccess: async () => {
      setPendingStage(null);
      setNote("");
      // The staff inbox counts by stage, so it goes stale on every move.
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["staff-requests"] }),
        qc.invalidateQueries({ queryKey: ["staff-pipeline", type, id] }),
        qc.invalidateQueries({ queryKey: ["admin", isBooking ? "bookings" : "orders"] }),
        qc.invalidateQueries({ queryKey: ["checkin"] }),
      ]);
    },
    onError: (err) =>
      Alert.alert(t("ops.moveFailedTitle"), err instanceof Error ? err.message : t("ops.tryAgain")),
  });

  const entity = entityQ.data;
  const booking = isBooking ? (entity as PipelineBooking | undefined) : undefined;
  const order = isBooking ? undefined : (entity as PipelineOrder | undefined);

  const current = entity?.stage ?? stages[0];
  const currentIdx = stageIndex(stages, current);

  // Cancelled/completed deals are off the pipeline — the server refuses to move
  // them, so don't offer a chip that can only 409. (A cancelled booking walked
  // forward would have flipped "refunded" back to "paid".)
  const isClosed = booking
    ? booking.status === "cancelled" || booking.status === "completed"
    : order?.status === "cancelled";

  // What the deal is about — vehicle for a rental, the first product (plus a
  // count) for a multi-item order.
  const itemLabel = useMemo(() => {
    if (booking) return booking.vehicle?.name ?? t("ops.itemFallback");
    const items = order?.items ?? [];
    if (items.length === 0) return t("ops.itemFallback");
    const first = items[0]?.product?.name ?? t("ops.itemFallback");
    return items.length > 1 ? `${first} +${items.length - 1}` : first;
  }, [booking, order, t]);

  const paid = booking
    ? booking.paymentStatus === "paid"
    : currentIdx >= stageIndex(ORDER_STAGES, "payment_collected");

  // A deep link or a stale tab could drop a customer here, and a bad :type
  // would render an empty vocabulary.
  if (me && !isStaff) return <Redirect href="/(tabs)" />;
  if (type && type !== "booking" && type !== "order") return <Redirect href="/(tabs)" />;

  const header = (
    <View style={styles.header}>
      <BackButton color={palette.text} />
      <Text style={[styles.title, { color: palette.text }]}>
        {isBooking ? t("ops.titleBooking") : t("ops.titleOrder")}
      </Text>
      <View style={{ width: 38 }} />
    </View>
  );

  if (entityQ.isError) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.bg }}>
        {header}
        <ErrorState onRetry={() => void entityQ.refetch()} />
      </View>
    );
  }

  if (entityQ.isLoading || !entity) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.bg }}>
        {header}
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand.friendlyBlue} size="large" />
        </View>
      </View>
    );
  }

  const contextTitle = `${itemLabel} · ${shortCode(entity.id)}`;

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      {header}

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 60 }}>
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <View style={styles.summaryTop}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.code, { color: colors.brand.friendlyBlue }]}>
                {shortCode(entity.id)}
              </Text>
              <Text style={[styles.customer, { color: palette.text }]}>
                {entity.user?.name || t("ops.guest")}
              </Text>
              <Text style={[styles.meta, { color: palette.muted }]}>
                {entity.user?.phone || t("ops.noPhone")}
              </Text>
            </View>
            <View
              style={[
                styles.payBadge,
                { backgroundColor: paid ? "rgba(169,244,83,0.15)" : "rgba(255,0,101,0.12)" },
              ]}
            >
              <Text
                style={[
                  styles.payText,
                  { color: paid ? colors.brand.ecoLimelight : colors.brand.trendyPink },
                ]}
              >
                {paid ? t("ops.paid") : t("ops.unpaid")}
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: palette.border }]} />

          <Row label={t("ops.item")} value={itemLabel} palette={palette} />
          {booking ? (
            <Row
              label={t("ops.dates")}
              value={`${new Date(booking.startDate).toLocaleDateString()} → ${new Date(
                booking.endDate,
              ).toLocaleDateString()}`}
              palette={palette}
            />
          ) : (
            <Row
              label={t("ops.placed")}
              value={new Date(order!.createdAt).toLocaleDateString()}
              palette={palette}
            />
          )}
          <Row
            label={t("ops.total")}
            value={money(booking ? booking.totalCost : order!.totalEgp)}
            palette={palette}
          />

          <Pressable
            onPress={() =>
              void openContextChat(router, {
                contextType: (isBooking ? "booking" : "order") as PipelineType,
                contextId: entity.id,
                contextTitle,
              })
            }
            style={({ pressed }) => [styles.messageBtn, pressed && { opacity: 0.9 }]}
          >
            <Ionicons name="chatbubble-ellipses" size={18} color="#fff" />
            <Text style={styles.messageText}>{t("ops.messageCustomer")}</Text>
          </Pressable>
        </View>

        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>{t("ops.moveStage")}</Text>
          <Text style={[styles.sectionHint, { color: palette.muted }]}>{t("ops.forwardOnly")}</Text>
          <View style={styles.stageRow}>
            {stages.map((s) => {
              const idx = stageIndex(stages, s);
              const isCurrent = idx === currentIdx;
              const isDone = idx < currentIdx;
              // ONLY the immediate next stage is tappable — the server advances
              // one step at a time, and each stage writes only its own side
              // effects. Offering a jump let staff mark a booking "returned"
              // (minting its loyalty payout) while it was still unpaid.
              const tappable = idx === currentIdx + 1 && !advance.isPending && !isClosed;
              return (
                <Pressable
                  key={s}
                  disabled={!tappable}
                  onPress={() => {
                    setNote("");
                    setPendingStage(s);
                  }}
                  style={[
                    styles.stage,
                    { borderColor: palette.border, backgroundColor: palette.chipBg },
                    isDone && { borderColor: colors.brand.ecoLimelight },
                    isCurrent && {
                      backgroundColor: colors.brand.trendyPink,
                      borderColor: colors.brand.trendyPink,
                    },
                    !tappable && !isCurrent && !isDone && { opacity: 0.55 },
                  ]}
                >
                  {isDone ? (
                    <Ionicons name="checkmark-circle" size={13} color={colors.brand.ecoLimelight} />
                  ) : null}
                  <Text
                    style={[
                      styles.stageText,
                      { color: isDone ? colors.brand.ecoLimelight : palette.text },
                      isCurrent && { color: "#fff" },
                    ]}
                  >
                    {t(STAGE_LABEL_KEY[s] ?? s)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>{t("ops.timeline")}</Text>
          {eventsQ.isLoading ? (
            <ActivityIndicator color={colors.brand.friendlyBlue} style={{ marginTop: 10 }} />
          ) : (eventsQ.data ?? []).length === 0 ? (
            <Text style={[styles.sectionHint, { color: palette.muted }]}>
              {t("ops.timelineEmpty")}
            </Text>
          ) : (
            (eventsQ.data ?? []).map((e) => (
              <View key={e.id} style={styles.eventRow}>
                <View style={[styles.eventDot, { backgroundColor: colors.brand.trendyPink }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.eventStage, { color: palette.text }]}>
                    {t(STAGE_LABEL_KEY[e.stage] ?? e.stage)}
                  </Text>
                  {e.note ? (
                    <Text style={[styles.eventNote, { color: palette.muted }]}>{e.note}</Text>
                  ) : null}
                  <Text style={[styles.eventWhen, { color: palette.dim }]}>
                    {new Date(e.createdAt).toLocaleString()} ·{" "}
                    {e.actorId && e.actorId === me?.id ? t("ops.byYou") : t("ops.byStaff")}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <Modal
        visible={!!pendingStage}
        transparent
        animationType="slide"
        onRequestClose={() => setPendingStage(null)}
      >
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setPendingStage(null)} />
          <View
            style={[styles.sheet, { backgroundColor: palette.card, borderColor: palette.border }]}
          >
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: palette.text }]}>
              {t("ops.confirmTitle")}
            </Text>
            <Text style={[styles.sheetStage, { color: colors.brand.trendyPink }]}>
              {pendingStage ? t(STAGE_LABEL_KEY[pendingStage] ?? pendingStage) : ""}
            </Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              multiline
              placeholder={t("ops.notePlaceholder")}
              placeholderTextColor={palette.muted}
              style={[
                styles.noteInput,
                { color: palette.text, borderColor: palette.border, backgroundColor: palette.bg },
              ]}
            />
            <Pressable
              disabled={advance.isPending}
              onPress={() =>
                pendingStage && advance.mutate({ stage: pendingStage, note: note.trim() })
              }
              style={({ pressed }) => [styles.confirmBtn, pressed && { opacity: 0.9 }]}
            >
              {advance.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.confirmText}>{t("ops.confirmCta")}</Text>
              )}
            </Pressable>
            <Pressable onPress={() => setPendingStage(null)} style={styles.cancelBtn}>
              <Text style={[styles.cancelText, { color: palette.muted }]}>{t("ops.cancel")}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
      <Text style={[styles.detailValue, { color: palette.text }]} numberOfLines={2}>
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
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: { borderRadius: 16, borderWidth: 1, padding: 16 },
  summaryTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  code: { fontSize: 12, fontWeight: "800", letterSpacing: 0.5 },
  customer: { fontSize: 18, fontWeight: "800" },
  meta: { fontSize: 13 },
  payBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  payText: { fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  divider: { height: 1, marginVertical: 12 },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    paddingVertical: 5,
  },
  detailLabel: { fontSize: 13, fontWeight: "600" },
  detailValue: { fontSize: 14, fontWeight: "700", flexShrink: 1, textAlign: "right" },
  messageBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.brand.friendlyBlue,
    height: 46,
    borderRadius: 12,
    marginTop: 14,
  },
  messageText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  sectionTitle: { fontSize: 15, fontWeight: "800" },
  sectionHint: { fontSize: 12, marginTop: 4 },
  stageRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  stage: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  stageText: { fontSize: 12, fontWeight: "700" },
  eventRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  eventDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  eventStage: { fontSize: 14, fontWeight: "700" },
  eventNote: { fontSize: 13, marginTop: 2 },
  eventWhen: { fontSize: 11, marginTop: 3 },
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
  },
  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.25)",
    marginBottom: 12,
  },
  sheetTitle: { fontSize: 18, fontWeight: "800" },
  sheetStage: { fontSize: 14, fontWeight: "800", marginTop: 4 },
  noteInput: {
    minHeight: 84,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginTop: 14,
    fontSize: 14,
    textAlignVertical: "top",
  },
  confirmBtn: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brand.trendyPink,
    height: 52,
    borderRadius: 14,
    marginTop: 16,
  },
  confirmText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  cancelBtn: { alignItems: "center", paddingVertical: 12, marginTop: 2 },
  cancelText: { fontSize: 14, fontWeight: "700" },
});
