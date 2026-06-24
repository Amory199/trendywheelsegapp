// Admin agent detail + unassigned pool. Two modes off one route:
//   /admin/sales-team/<agentId>   → that agent's open leads, reassign, set target
//   /admin/sales-team/unassigned  → the pool, assign each lead to an agent
// Reassign/assign both go through the same agent picker.

import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import * as Haptics from "expo-haptics";
import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "../../../lib/api";
import { useT } from "../../../lib/locale";

interface Agent {
  id: string;
  name?: string;
  staffRole?: string | null;
  salesTargetMonthly?: number | string | null;
  monthWonAmount?: number;
  monthWonCount?: number;
  openLeads?: number;
  progressPct?: number | null;
}
interface Lead {
  id: string;
  contactName?: string;
  contactPhone?: string | null;
  status?: string;
  estimatedValue?: number | string | null;
  source?: string | null;
}

export default function AgentDetail(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const isPool = id === "unassigned";

  const [pickFor, setPickFor] = useState<string | null>(null); // leadId awaiting agent pick
  const [assignOpen, setAssignOpen] = useState(false); // agent-first lead picker
  const [targetOpen, setTargetOpen] = useState(false);
  const [targetInput, setTargetInput] = useState("");

  const teamQ = useQuery({
    queryKey: ["admin", "sales-team"],
    queryFn: async (): Promise<Agent[]> => {
      const r = await api.crmTeam();
      return (r.data ?? []) as Agent[];
    },
  });

  const leadsQ = useQuery({
    queryKey: ["admin", "sales-team", "leads", id],
    queryFn: async (): Promise<Lead[]> => {
      const r = await api.crmLeads({ ownerId: id! });
      // For an agent we want their working set (drop terminal + parked states).
      // For the pool, parked (inactive) leads ARE the backlog to hand out — keep
      // them, only hide the truly closed ones.
      const drop = isPool ? ["won", "lost"] : ["won", "lost", "inactive"];
      return ((r.data ?? []) as Lead[]).filter((l) => !drop.includes(l.status ?? ""));
    },
    enabled: !!id,
  });

  // Agent-first assignment: the pool of unassigned leads the admin can hand to
  // THIS agent (only fetched on an agent screen, not the pool itself).
  const poolLeadsQ = useQuery({
    queryKey: ["admin", "sales-team", "pool-leads"],
    queryFn: async (): Promise<Lead[]> => {
      const r = await api.crmLeads({ ownerId: "unassigned" });
      return ((r.data ?? []) as Lead[]).filter((l) => !["won", "lost"].includes(l.status ?? ""));
    },
    enabled: !isPool,
  });

  const agent = (teamQ.data ?? []).find((a) => a.id === id);
  const agents = (teamQ.data ?? []).filter((a) => a.staffRole === "sales" || !a.staffRole);

  const invalidate = (): void => {
    void qc.invalidateQueries({ queryKey: ["admin", "sales-team"] });
  };

  const reassign = useMutation({
    mutationFn: ({ leadId, ownerId }: { leadId: string; ownerId: string }) =>
      api.crmReassignLead(leadId, ownerId),
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPickFor(null);
      setAssignOpen(false);
      invalidate();
    },
    onError: (e: Error) => Alert.alert(t("admin.agentReassignFailed"), e.message),
  });

  const setTarget = useMutation({
    mutationFn: (amount: number) =>
      api.adminSetSalesTarget({
        agentId: id!,
        targetMonthly: amount,
        month: new Date().toISOString(),
      }),
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTargetOpen(false);
      setTargetInput("");
      invalidate();
    },
    onError: (e: Error) => Alert.alert(t("admin.agentSetTargetFailed"), e.message),
  });

  const title = isPool ? t("admin.agentPoolTitle") : (agent?.name ?? t("admin.agentFallback"));

  return (
    <>
      <Stack.Screen
        options={{
          title,
          headerStyle: { backgroundColor: colors.dark.bg },
          headerTitleStyle: { color: "#fff" },
          headerTintColor: "#fff",
        }}
      />
      <View style={[styles.root, { paddingTop: insets.top }]}>
        {!isPool && agent ? (
          <View style={styles.agentHeader}>
            <View style={styles.statsRow}>
              <Stat
                label={t("admin.statOpen")}
                value={agent.openLeads ?? 0}
                tint={colors.brand.poolBlue}
              />
              <Stat
                label={t("admin.statWonMonth")}
                value={agent.monthWonCount ?? 0}
                tint={colors.brand.ecoLimelight ?? "#A9F453"}
              />
              <Stat
                label={t("admin.statRevenue")}
                value={Math.round((agent.monthWonAmount ?? 0) / 1000)}
                suffix="k"
                tint={colors.brand.trendyPink}
              />
            </View>
            <View style={styles.headerBtnRow}>
              <Pressable style={styles.assignLeadBtn} onPress={() => setAssignOpen(true)}>
                <Ionicons name="person-add" size={15} color="#fff" />
                <Text style={styles.targetBtnText}>{t("admin.agentAssignLeadCta")}</Text>
              </Pressable>
              <Pressable style={styles.targetBtn} onPress={() => setTargetOpen(true)}>
                <Ionicons name="flag-outline" size={15} color="#fff" />
                <Text style={styles.targetBtnText}>
                  {Number(agent.salesTargetMonthly ?? 0) > 0
                    ? `${t("admin.agentTargetPrefix")}${Math.round(Number(agent.salesTargetMonthly)).toLocaleString()}`
                    : t("admin.agentSetTarget")}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {leadsQ.isLoading ? (
          <ActivityIndicator
            color={colors.brand.trendyPink}
            style={{ marginTop: 40 }}
            size="large"
          />
        ) : (
          <FlatList<Lead>
            data={leadsQ.data ?? []}
            keyExtractor={(l) => l.id}
            contentContainerStyle={{ padding: 14, paddingBottom: 60, gap: 10 }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="checkmark-done-outline" size={44} color={colors.text.secondary} />
                <Text style={styles.emptyText}>
                  {isPool ? t("admin.agentNoUnassigned") : t("admin.agentNoOpenLeads")}
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.leadCard}>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={styles.leadName}>
                    {item.contactName ?? t("admin.agentLeadFallback")}
                  </Text>
                  <Text style={styles.leadMeta}>
                    {item.status ?? t("admin.agentLeadStatusFallback")} ·{" "}
                    {item.source ?? t("admin.dash")} · {t("admin.egp")}{" "}
                    {Number(item.estimatedValue ?? 0).toLocaleString()}
                  </Text>
                </View>
                <Pressable style={styles.assignBtn} onPress={() => setPickFor(item.id)}>
                  <Ionicons name="person-add" size={14} color="#fff" />
                  <Text style={styles.assignText}>
                    {isPool ? t("admin.agentAssign") : t("admin.agentReassign")}
                  </Text>
                </Pressable>
              </View>
            )}
          />
        )}
      </View>

      {/* Agent picker */}
      <Modal
        visible={!!pickFor}
        transparent
        animationType="slide"
        onRequestClose={() => setPickFor(null)}
      >
        <Pressable style={styles.modalBg} onPress={() => setPickFor(null)}>
          <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>{t("admin.agentAssignTo")}</Text>
            <FlatList
              data={agents}
              keyExtractor={(a) => a.id}
              ListEmptyComponent={<Text style={styles.emptyText}>{t("admin.agentNoAgents")}</Text>}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.agentRow}
                  disabled={reassign.isPending}
                  onPress={() => pickFor && reassign.mutate({ leadId: pickFor, ownerId: item.id })}
                >
                  <Ionicons name="person-circle" size={28} color={colors.brand.trendyPink} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.agentName}>{item.name ?? t("admin.agentFallback")}</Text>
                    <Text style={styles.agentSub}>
                      {item.openLeads ?? 0}
                      {t("admin.agentOpenLeadsSuffix")}
                    </Text>
                  </View>
                  {reassign.isPending ? (
                    <ActivityIndicator color={colors.brand.trendyPink} />
                  ) : null}
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>

      {/* Agent-first: pick a lead from the pool to hand to this agent */}
      <Modal
        visible={assignOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setAssignOpen(false)}
      >
        <Pressable style={styles.modalBg} onPress={() => setAssignOpen(false)}>
          <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>{t("admin.agentPickLead")}</Text>
            {poolLeadsQ.isLoading ? (
              <ActivityIndicator color={colors.brand.trendyPink} style={{ marginTop: 20 }} />
            ) : (
              <FlatList
                data={poolLeadsQ.data ?? []}
                keyExtractor={(l) => l.id}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>{t("admin.agentNoPoolLeads")}</Text>
                }
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.agentRow}
                    disabled={reassign.isPending}
                    onPress={() => reassign.mutate({ leadId: item.id, ownerId: id! })}
                  >
                    <Ionicons name="person-circle" size={28} color={colors.brand.poolBlue} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.agentName}>
                        {item.contactName ?? t("admin.agentLeadFallback")}
                      </Text>
                      <Text style={styles.agentSub}>
                        {item.source ?? t("admin.dash")} · {t("admin.egp")}{" "}
                        {Number(item.estimatedValue ?? 0).toLocaleString()}
                      </Text>
                    </View>
                    {reassign.isPending ? (
                      <ActivityIndicator color={colors.brand.trendyPink} />
                    ) : null}
                  </Pressable>
                )}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Set target */}
      <Modal
        visible={targetOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setTargetOpen(false)}
      >
        <Pressable style={styles.modalBg} onPress={() => setTargetOpen(false)}>
          <Pressable style={styles.targetModal} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>{t("admin.agentMonthlyTarget")}</Text>
            <TextInput
              style={styles.targetInput}
              keyboardType="number-pad"
              placeholder={t("admin.agentTargetPlaceholder")}
              placeholderTextColor={colors.text.secondary}
              value={targetInput}
              onChangeText={setTargetInput}
              autoFocus
            />
            <Pressable
              style={[styles.saveBtn, (!targetInput || setTarget.isPending) && { opacity: 0.4 }]}
              disabled={!targetInput || setTarget.isPending}
              onPress={() => {
                const n = Number(targetInput);
                if (!Number.isFinite(n) || n <= 0) {
                  Alert.alert(t("admin.agentInvalidAmount"));
                  return;
                }
                setTarget.mutate(n);
              }}
            >
              <Text style={styles.saveBtnText}>
                {setTarget.isPending ? t("admin.agentSaving") : t("admin.agentSaveTarget")}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function Stat({
  label,
  value,
  tint,
  suffix,
}: {
  label: string;
  value: number;
  tint: string;
  suffix?: string;
}): React.JSX.Element {
  return (
    <View style={{ alignItems: "flex-start" }}>
      <Text style={[styles.statValue, { color: tint }]}>
        {value.toLocaleString()}
        {suffix ?? ""}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.dark.bg },
  agentHeader: {
    padding: 16,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  statsRow: { flexDirection: "row", gap: 28 },
  statValue: { fontSize: 20, fontWeight: "800" },
  statLabel: { color: colors.text.secondary, fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  headerBtnRow: { flexDirection: "row", gap: 10 },
  assignLeadBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.brand.trendyPink,
    borderRadius: 10,
    paddingVertical: 11,
  },
  targetBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.brand.friendlyBlue,
    borderRadius: 10,
    paddingVertical: 11,
  },
  targetBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  empty: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyText: {
    color: colors.text.secondary,
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 16,
  },
  leadCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.dark.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: 12,
  },
  leadName: { color: colors.text.light, fontSize: 14, fontWeight: "700" },
  leadMeta: { color: colors.text.secondary, fontSize: 11, textTransform: "capitalize" },
  assignBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.brand.trendyPink,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  assignText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  modal: {
    backgroundColor: colors.dark.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    maxHeight: "70%",
  },
  modalTitle: { color: colors.text.light, fontSize: 18, fontWeight: "700", marginBottom: 14 },
  agentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  agentName: { color: colors.text.light, fontSize: 14, fontWeight: "700" },
  agentSub: { color: colors.text.secondary, fontSize: 11 },
  targetModal: {
    backgroundColor: colors.dark.bg,
    margin: 24,
    marginBottom: "auto",
    marginTop: "auto",
    borderRadius: 18,
    padding: 20,
    gap: 14,
  },
  targetInput: {
    backgroundColor: colors.dark.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: 14,
    color: colors.text.light,
    fontSize: 18,
    fontWeight: "700",
  },
  saveBtn: {
    backgroundColor: colors.brand.trendyPink,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});
