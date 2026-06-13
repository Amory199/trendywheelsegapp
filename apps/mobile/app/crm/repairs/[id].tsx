// Staff repair detail — start / complete a work order. Lean staff-scoped
// screen (lives under the staff hub, not the admin console) so a non-admin
// staff member can move a repair through its lifecycle without seeing admin
// god-mode tabs.

import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import * as Haptics from "expo-haptics";
import { Stack, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "../../../lib/api";
import { useT } from "../../../lib/locale";

interface Repair {
  id: string;
  category?: string;
  description?: string;
  status: string;
  createdAt: string;
  preferredDate?: string | null;
  assignedMechanicId?: string | null;
  user?: { name?: string; phone?: string };
}

const STATUS_TONE: Record<string, string> = {
  submitted: colors.text.secondary,
  assigned: colors.brand.poolBlue,
  in_progress: "#F5B800",
  completed: colors.brand.ecoLimelight ?? "#A9F453",
  cancelled: "#EF4444",
};

const STATUS_LABEL_KEY: Record<string, string> = {
  submitted: "crm.repairs.statusSubmitted",
  assigned: "crm.repairs.statusAssigned",
  in_progress: "crm.repairs.statusInProgress",
  completed: "crm.repairs.statusCompleted",
};

export default function StaffRepairDetail(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const t = useT();

  const q = useQuery({
    queryKey: ["staff", "repair", id],
    queryFn: async (): Promise<Repair> => {
      const r = await api.getRepairRequest(id!);
      return (r as { data: Repair }).data;
    },
    enabled: !!id,
  });

  const invalidate = (): void => {
    void qc.invalidateQueries({ queryKey: ["staff", "repair", id] });
    void qc.invalidateQueries({ queryKey: ["staff", "repairs"] });
  };

  const start = useMutation({
    mutationFn: () => api.adminStartRepair(id!),
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      invalidate();
    },
  });
  const complete = useMutation({
    mutationFn: () => api.adminCompleteRepair(id!),
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      invalidate();
    },
  });

  const r = q.data;
  const canStart = r && (r.status === "submitted" || r.status === "assigned");
  const canComplete = r && r.status === "in_progress";

  return (
    <>
      <Stack.Screen
        options={{
          title: t("crm.repairDetail.title"),
          headerStyle: { backgroundColor: colors.dark.bg },
          headerTitleStyle: { color: "#fff" },
          headerTintColor: "#fff",
        }}
      />
      {q.isLoading || !r ? (
        <View style={[styles.root, styles.center]}>
          <ActivityIndicator color="#F5B800" />
        </View>
      ) : (
        <ScrollView
          style={styles.root}
          contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16, gap: 14 }}
        >
          <View style={styles.statusPill}>
            <View style={[styles.dot, { backgroundColor: STATUS_TONE[r.status] }]} />
            <Text style={[styles.statusText, { color: STATUS_TONE[r.status] }]}>
              {STATUS_LABEL_KEY[r.status] ? t(STATUS_LABEL_KEY[r.status]) : r.status}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>{t("crm.repairDetail.category")}</Text>
            <Text style={styles.value}>{r.category ?? t("crm.repairDetail.fallbackCategory")}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.label}>{t("crm.repairDetail.description")}</Text>
            <Text style={styles.body}>{r.description ?? "—"}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.label}>{t("crm.repairDetail.customer")}</Text>
            <Text style={styles.value}>
              {r.user?.name ?? t("crm.repairDetail.fallbackCustomer")}
            </Text>
            {r.user?.phone ? (
              <Pressable
                style={styles.callRow}
                onPress={() => void Linking.openURL(`tel:${r.user!.phone}`)}
              >
                <Ionicons name="call" size={15} color={colors.brand.ecoLimelight ?? "#A9F453"} />
                <Text style={styles.callText}>{r.user.phone}</Text>
              </Pressable>
            ) : null}
          </View>
          <View style={styles.card}>
            <Text style={styles.label}>{t("crm.repairDetail.requested")}</Text>
            <Text style={styles.value}>{new Date(r.createdAt).toLocaleString()}</Text>
            {r.preferredDate ? (
              <Text style={styles.subtle}>
                {t("crm.repairDetail.preferredPrefix")}{" "}
                {new Date(r.preferredDate).toLocaleDateString()}
              </Text>
            ) : null}
          </View>

          {canStart ? (
            <Pressable
              style={[styles.action, { backgroundColor: "#F5B800" }]}
              disabled={start.isPending}
              onPress={() => start.mutate()}
            >
              <Ionicons name="play" size={18} color="#000" />
              <Text style={[styles.actionText, { color: "#000" }]}>
                {start.isPending
                  ? t("crm.repairDetail.starting")
                  : t("crm.repairDetail.startRepair")}
              </Text>
            </Pressable>
          ) : null}
          {canComplete ? (
            <Pressable
              style={[styles.action, { backgroundColor: colors.brand.ecoLimelight ?? "#A9F453" }]}
              disabled={complete.isPending}
              onPress={() => complete.mutate()}
            >
              <Ionicons name="checkmark-done" size={18} color="#000" />
              <Text style={[styles.actionText, { color: "#000" }]}>
                {complete.isPending
                  ? t("crm.repairDetail.completing")
                  : t("crm.repairDetail.markCompleted")}
              </Text>
            </Pressable>
          ) : null}
          {r.status === "completed" ? (
            <View style={[styles.action, { backgroundColor: colors.dark.card }]}>
              <Ionicons
                name="checkmark-circle"
                size={18}
                color={colors.brand.ecoLimelight ?? "#A9F453"}
              />
              <Text style={[styles.actionText, { color: colors.text.light }]}>
                {t("crm.repairDetail.repairCompleted")}
              </Text>
            </View>
          ) : null}
        </ScrollView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.dark.bg },
  center: { justifyContent: "center", alignItems: "center" },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    backgroundColor: colors.dark.card,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: "800", textTransform: "capitalize" },
  card: { backgroundColor: colors.dark.card, padding: 14, borderRadius: 12, gap: 6 },
  label: {
    color: colors.text.secondary,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  value: { color: colors.text.light, fontSize: 15, fontWeight: "700", textTransform: "capitalize" },
  body: { color: colors.text.light, fontSize: 14, lineHeight: 20 },
  subtle: { color: colors.text.secondary, fontSize: 12 },
  callRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  callText: { color: colors.brand.ecoLimelight ?? "#A9F453", fontSize: 14, fontWeight: "700" },
  action: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    borderRadius: 12,
  },
  actionText: { fontSize: 15, fontWeight: "800" },
});
