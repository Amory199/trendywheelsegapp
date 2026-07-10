import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { RepairRequest } from "@trendywheels/types";
import { borderRadius, colors, spacing } from "@trendywheels/ui-tokens";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { GuestGate } from "../../components/GuestGate";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-store";
import { openContextChat } from "../../lib/context-chat";
import { useT } from "../../lib/locale";
import { useTracking } from "../../lib/typography";

const STATUS_ORDER = ["submitted", "assigned", "in-progress", "completed"] as const;
type RepairStatus = (typeof STATUS_ORDER)[number] | "cancelled";

const STATUS_LABEL_KEY: Record<RepairStatus, string> = {
  submitted: "service.detail.statusSubmitted",
  assigned: "service.detail.statusAssigned",
  "in-progress": "service.detail.statusInProgress",
  completed: "service.detail.statusCompleted",
  cancelled: "service.detail.statusCancelled",
};

const PRIORITY_LABEL_KEY: Record<string, string> = {
  low: "service.detail.priorityLow",
  medium: "service.detail.priorityMedium",
  high: "service.detail.priorityHigh",
  urgent: "service.detail.priorityUrgent",
};

const STATUS_META: Record<
  RepairStatus,
  { color: string; icon: React.ComponentProps<typeof Ionicons>["name"] }
> = {
  submitted: { color: colors.text.secondary, icon: "cloud-upload-outline" },
  assigned: { color: colors.primary[400], icon: "person-outline" },
  "in-progress": { color: colors.warning, icon: "construct-outline" },
  completed: { color: colors.success, icon: "checkmark-circle-outline" },
  cancelled: { color: colors.error, icon: "close-circle-outline" },
};

const PRIORITY_COLOR: Record<string, string> = {
  low: colors.success,
  medium: colors.warning,
  high: colors.error,
  urgent: colors.error,
};

const CATEGORY_ICON: Record<string, React.ComponentProps<typeof Ionicons>["name"]> = {
  mechanical: "cog-outline",
  electrical: "flash-outline",
  cosmetic: "color-palette-outline",
  other: "build-outline",
};

export default function RepairDetailScreen(): JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const t = useT();
  const track = useTracking();
  const user = useAuth((s) => s.user);

  const { data, isLoading } = useQuery({
    queryKey: ["repair-request", id],
    queryFn: () => api.getRepairRequest(id!),
    enabled: !!id,
  });

  const cancelMut = useMutation({
    mutationFn: () => api.cancelRepairRequest(id!),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["repair-request", id] });
      void qc.invalidateQueries({ queryKey: ["repair-requests"] });
    },
  });

  const repair = data?.data as RepairRequest | undefined;

  if (!user) return <GuestGate />;

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent.DEFAULT} />
      </View>
    );
  }

  if (!repair) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.text.secondary} />
        <Text style={styles.emptyText}>{t("service.detail.notFound")}</Text>
      </View>
    );
  }

  const currentStatusIdx = (STATUS_ORDER as readonly string[]).indexOf(repair.status);
  const currentMeta = STATUS_META[repair.status as RepairStatus] ?? STATUS_META.submitted;

  // Staff-committed ETA — only meaningful while the repair is still live.
  const eta =
    repair.etaAt && repair.status !== "completed" && repair.status !== "cancelled"
      ? new Date(repair.etaAt)
      : null;
  const etaIsToday = eta ? eta.toDateString() === new Date().toDateString() : false;
  const mechanicPhone = repair.mechanic?.phone ?? null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.text.light} />
        </Pressable>
        <Text style={styles.headerTitle}>{t("service.detail.headerTitle")}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Hero */}
        <Animated.View
          entering={FadeInDown.springify()}
          style={[styles.heroCard, { borderColor: `${currentMeta.color}55` }]}
        >
          <View style={[styles.heroIconWrap, { backgroundColor: `${currentMeta.color}22` }]}>
            <Ionicons name={currentMeta.icon} size={32} color={currentMeta.color} />
          </View>
          <View style={styles.heroInfo}>
            <Text style={[styles.heroStatus, { letterSpacing: track(0.5) }]}>
              {STATUS_LABEL_KEY[repair.status as RepairStatus]
                ? t(STATUS_LABEL_KEY[repair.status as RepairStatus])
                : repair.status.replace("-", " ").toUpperCase()}
            </Text>
            <Text style={styles.heroDate}>
              {t("service.detail.submittedOn")}{" "}
              {new Date(repair.createdAt).toLocaleDateString("en-EG", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </Text>
          </View>
          <View
            style={[
              styles.priorityBadge,
              { backgroundColor: `${PRIORITY_COLOR[repair.priority] ?? colors.text.secondary}22` },
            ]}
          >
            <Text
              style={[
                styles.priorityText,
                { color: PRIORITY_COLOR[repair.priority] ?? colors.text.secondary },
              ]}
            >
              {PRIORITY_LABEL_KEY[repair.priority]
                ? t(PRIORITY_LABEL_KEY[repair.priority])
                : repair.priority.toUpperCase()}
            </Text>
          </View>
        </Animated.View>

        {/* ETA — the big "ready by" time staff committed to */}
        {eta ? (
          <Animated.View entering={FadeInDown.delay(40).springify()} style={styles.etaCard}>
            <View style={styles.etaIconWrap}>
              <Ionicons name="time-outline" size={26} color={colors.accent.DEFAULT} />
            </View>
            <View style={styles.etaInfo}>
              <Text style={[styles.etaLabel, { letterSpacing: track(0.8) }]}>
                {t("service.detail.eta")}
              </Text>
              <Text style={styles.etaTime}>
                {eta.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </Text>
              {!etaIsToday ? (
                <Text style={styles.etaDate}>
                  {eta.toLocaleDateString("en-EG", {
                    weekday: "short",
                    day: "numeric",
                    month: "long",
                  })}
                </Text>
              ) : null}
            </View>
          </Animated.View>
        ) : null}

        {/* Progress timeline */}
        <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.card}>
          <Text style={styles.sectionTitle}>{t("service.detail.progress")}</Text>
          <View style={styles.timeline}>
            {STATUS_ORDER.map((status, i) => {
              const done = i <= currentStatusIdx;
              const meta = STATUS_META[status];
              return (
                <View key={status} style={styles.timelineRow}>
                  {/* Vertical connector */}
                  <View style={styles.timelineConnector}>
                    <View style={[styles.timelineDot, done && { backgroundColor: meta.color }]}>
                      {done && (
                        <Ionicons
                          name={i < currentStatusIdx ? "checkmark" : meta.icon}
                          size={12}
                          color={i < currentStatusIdx ? "#000" : "#000"}
                        />
                      )}
                    </View>
                    {i < STATUS_ORDER.length - 1 && (
                      <View
                        style={[
                          styles.timelineBar,
                          i < currentStatusIdx && { backgroundColor: meta.color },
                        ]}
                      />
                    )}
                  </View>
                  {/* Label */}
                  <View style={styles.timelineContent}>
                    <Text style={[styles.timelineLabel, done && { color: colors.text.light }]}>
                      {STATUS_LABEL_KEY[status as RepairStatus]
                        ? t(STATUS_LABEL_KEY[status as RepairStatus])
                        : status.charAt(0).toUpperCase() + status.slice(1).replace("-", " ")}
                    </Text>
                    {status === "submitted" && (
                      <Text style={styles.timelineSub}>
                        {new Date(repair.createdAt).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </Animated.View>

        {/* Request details */}
        <Animated.View entering={FadeInDown.delay(140).springify()} style={styles.card}>
          <Text style={styles.sectionTitle}>{t("service.detail.details")}</Text>
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons
                name={CATEGORY_ICON[repair.category] ?? "build-outline"}
                size={18}
                color={colors.primary[400]}
              />
            </View>
            <View style={styles.detailContent}>
              <Text style={[styles.detailLabel, { letterSpacing: track(0.5) }]}>
                {t("service.detail.category")}
              </Text>
              <Text style={styles.detailValue}>{repair.category}</Text>
            </View>
          </View>
          {repair.description ? (
            <View style={[styles.detailRow, { alignItems: "flex-start" }]}>
              <View style={styles.detailIcon}>
                <Ionicons name="document-text-outline" size={18} color={colors.primary[400]} />
              </View>
              <View style={styles.detailContent}>
                <Text style={[styles.detailLabel, { letterSpacing: track(0.5) }]}>
                  {t("service.detail.description")}
                </Text>
                <Text style={[styles.detailValue, { lineHeight: 20 }]}>{repair.description}</Text>
              </View>
            </View>
          ) : null}
        </Animated.View>

        {/* Cost estimate */}
        {(repair.estimatedCost !== null || repair.actualCost !== null) && (
          <Animated.View entering={FadeInDown.delay(180).springify()} style={styles.card}>
            <Text style={styles.sectionTitle}>{t("service.detail.cost")}</Text>
            <View style={styles.costRow}>
              {repair.estimatedCost !== null && (
                <View style={styles.costItem}>
                  <Text style={styles.costLabel}>{t("service.detail.estimated")}</Text>
                  <Text style={styles.costValue}>
                    {Number(repair.estimatedCost).toLocaleString()} {t("service.detail.currency")}
                  </Text>
                </View>
              )}
              {repair.estimatedCost !== null && repair.actualCost !== null && (
                <View style={styles.costDivider} />
              )}
              {repair.actualCost !== null && (
                <View style={styles.costItem}>
                  <Text style={styles.costLabel}>{t("service.detail.actual")}</Text>
                  <Text style={[styles.costValue, { color: colors.accent.DEFAULT }]}>
                    {Number(repair.actualCost).toLocaleString()} {t("service.detail.currency")}
                  </Text>
                </View>
              )}
            </View>
          </Animated.View>
        )}

        {/* Mechanic / Assignment */}
        <Animated.View entering={FadeInDown.delay(220).springify()} style={styles.card}>
          <Text style={styles.sectionTitle}>{t("service.detail.assignedMechanic")}</Text>
          {repair.assignedMechanicId ? (
            <View style={styles.mechanicRow}>
              <View style={styles.mechanicAvatar}>
                <Ionicons name="person" size={24} color={colors.primary[400]} />
              </View>
              <View style={styles.mechanicInfo}>
                <Text style={styles.mechanicName}>
                  {repair.mechanic?.name ?? t("service.detail.mechanicAssigned")}
                </Text>
                <Text style={styles.mechanicSub}>
                  {t("service.detail.idPrefix")} {repair.assignedMechanicId.slice(0, 8)}…
                </Text>
              </View>
              <View style={styles.mechanicActions}>
                {mechanicPhone ? (
                  <>
                    <Pressable
                      style={styles.contactMechanicAlt}
                      onPress={() => void Linking.openURL(`tel:${mechanicPhone}`)}
                    >
                      <Ionicons name="call-outline" size={18} color={colors.text.light} />
                    </Pressable>
                    <Pressable
                      style={styles.contactMechanicAlt}
                      onPress={() =>
                        void Linking.openURL(
                          `https://wa.me/${mechanicPhone.replace(/[^0-9]/g, "")}`,
                        )
                      }
                    >
                      <Ionicons name="logo-whatsapp" size={18} color={colors.success} />
                    </Pressable>
                  </>
                ) : null}
                <Pressable
                  style={styles.contactMechanic}
                  onPress={() =>
                    void openContextChat(router, {
                      contextType: "repair",
                      contextId: repair.id,
                      contextTitle: `Repair · ${repair.id.slice(0, 8).toUpperCase()}`,
                    })
                  }
                >
                  <Ionicons name="chatbubble-outline" size={18} color="#000" />
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.unassigned}>
              <Ionicons name="hourglass-outline" size={24} color={colors.text.secondary} />
              <Text style={styles.unassignedText}>{t("service.detail.pendingAssignment")}</Text>
            </View>
          )}
        </Animated.View>

        {/* Cancel — customer can cancel until in-progress */}
        {repair.status !== "completed" && repair.status !== "cancelled" ? (
          <Pressable
            style={styles.cancelBtn}
            disabled={cancelMut.isPending}
            onPress={() => {
              Alert.alert(t("service.detail.cancelTitle"), t("service.detail.cancelMessage"), [
                { text: t("service.detail.keep"), style: "cancel" },
                {
                  text: t("service.detail.cancelRepair"),
                  style: "destructive",
                  onPress: () => cancelMut.mutate(),
                },
              ]);
            }}
          >
            <Ionicons name="close-circle-outline" size={18} color={colors.error} />
            <Text style={styles.cancelBtnText}>
              {cancelMut.isPending
                ? t("service.detail.cancelling")
                : t("service.detail.cancelRepair")}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  center: {
    flex: 1,
    backgroundColor: colors.dark.bg,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md,
  },
  emptyText: { color: colors.text.secondary, fontSize: 15 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 56,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  headerTitle: { color: colors.text.light, fontSize: 16, fontWeight: "700" },

  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.dark.card,
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1,
    gap: spacing.md,
  },
  heroIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  heroInfo: { flex: 1 },
  heroStatus: { color: colors.text.light, fontSize: 14, fontWeight: "700" },
  heroDate: { color: colors.text.secondary, fontSize: 12, marginTop: 2 },
  priorityBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  priorityText: { fontSize: 10, fontWeight: "700" },

  etaCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.dark.card,
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.accent.DEFAULT}55`,
    gap: spacing.md,
  },
  etaIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${colors.accent.DEFAULT}22`,
    justifyContent: "center",
    alignItems: "center",
  },
  etaInfo: { flex: 1 },
  etaLabel: {
    color: colors.text.secondary,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  etaTime: { color: colors.accent.DEFAULT, fontSize: 28, fontWeight: "800", marginTop: 2 },
  etaDate: { color: colors.text.secondary, fontSize: 12, marginTop: 2 },

  card: {
    backgroundColor: colors.dark.card,
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.dark.border,
    gap: spacing.md,
  },
  sectionTitle: { color: colors.text.light, fontSize: 14, fontWeight: "700" },

  timeline: { gap: 0 },
  timelineRow: { flexDirection: "row", alignItems: "flex-start" },
  timelineConnector: { alignItems: "center", width: 32 },
  timelineDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.dark.border,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  timelineBar: {
    width: 2,
    height: 28,
    backgroundColor: colors.dark.border,
    marginVertical: 2,
  },
  timelineContent: { flex: 1, paddingLeft: spacing.sm, paddingTop: 4, paddingBottom: spacing.md },
  timelineLabel: {
    color: colors.text.secondary,
    fontSize: 14,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  timelineSub: { color: colors.text.secondary, fontSize: 11, marginTop: 2 },

  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  detailIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${colors.primary[700]}22`,
    justifyContent: "center",
    alignItems: "center",
  },
  detailContent: { flex: 1 },
  detailLabel: {
    color: colors.text.secondary,
    fontSize: 11,
    textTransform: "uppercase",
  },
  detailValue: {
    color: colors.text.light,
    fontSize: 14,
    fontWeight: "500",
    marginTop: 2,
    textTransform: "capitalize",
  },

  costRow: {
    flexDirection: "row",
    backgroundColor: colors.dark.bg,
    borderRadius: 10,
    overflow: "hidden",
  },
  costItem: { flex: 1, alignItems: "center", padding: spacing.md },
  costLabel: { color: colors.text.secondary, fontSize: 11 },
  costValue: { color: colors.text.light, fontSize: 18, fontWeight: "700", marginTop: 4 },
  costDivider: { width: 1, backgroundColor: colors.dark.border, marginVertical: spacing.sm },

  mechanicRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  mechanicAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${colors.primary[700]}33`,
    justifyContent: "center",
    alignItems: "center",
  },
  mechanicInfo: { flex: 1 },
  mechanicName: { color: colors.text.light, fontSize: 14, fontWeight: "600" },
  mechanicSub: { color: colors.text.secondary, fontSize: 12, marginTop: 2 },
  mechanicActions: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  contactMechanic: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent.DEFAULT,
    justifyContent: "center",
    alignItems: "center",
  },
  contactMechanicAlt: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.dark.bg,
    borderWidth: 1,
    borderColor: colors.dark.border,
    justifyContent: "center",
    alignItems: "center",
  },
  unassigned: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    backgroundColor: colors.dark.bg,
    borderRadius: 10,
    padding: spacing.md,
  },
  unassignedText: { flex: 1, color: colors.text.secondary, fontSize: 13, lineHeight: 20 },

  messagesBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.dark.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  messagesBtnText: { flex: 1, color: colors.text.light, fontSize: 14, fontWeight: "600" },

  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.error}55`,
  },
  cancelBtnText: { color: colors.error, fontSize: 14, fontWeight: "700" },
});
