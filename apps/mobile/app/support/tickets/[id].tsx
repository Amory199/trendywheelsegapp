import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { api } from "../../../lib/api";
import { useT } from "../../../lib/locale";
import { useTracking } from "../../../lib/typography";

interface Ticket {
  id: string;
  userId?: string;
  subject: string;
  status: string;
  priority: string;
  category?: string;
  message?: string;
  createdAt: string;
  user?: { id?: string; name?: string; phone?: string; email?: string };
  agent?: { id?: string; name?: string };
  assignedAgentId?: string | null;
}

interface Agent {
  id: string;
  name?: string;
  phone?: string;
}

const STATUSES = ["open", "in-progress", "resolved", "closed"];
const PRIORITIES = ["low", "medium", "high", "urgent"];
const PRIORITY_COLOR: Record<string, string> = {
  urgent: "#FF3D6E",
  high: "#FF7A00",
  medium: "#F5B800",
  low: colors.brand.poolBlue,
};
const STATUS_KEY = {
  open: "support.statusOpen",
  "in-progress": "support.statusInProgress",
  resolved: "support.statusResolved",
  closed: "support.statusClosed",
} as const;
const PRIORITY_KEY = {
  low: "support.priorityLow",
  medium: "support.priorityMedium",
  high: "support.priorityHigh",
  urgent: "support.priorityUrgent",
} as const;

export default function SupportTicketDetail(): React.JSX.Element {
  const qc = useQueryClient();
  const t = useT();
  const track = useTracking();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [reply, setReply] = useState("");
  const [assignOpen, setAssignOpen] = useState(false);

  const ticketQ = useQuery({
    queryKey: ["support", "ticket", id],
    queryFn: async (): Promise<Ticket> => {
      const r = await api.getTicket(id!);
      return r.data as unknown as Ticket;
    },
    enabled: !!id,
  });

  const agentsQ = useQuery({
    queryKey: ["support", "agents"],
    queryFn: async (): Promise<Agent[]> => {
      const r = await api.adminListUsers({ staffRole: "support" });
      return ((r as { data?: Agent[] }).data ?? []) as Agent[];
    },
    enabled: assignOpen,
  });

  const update = useMutation({
    mutationFn: async (patch: Record<string, unknown>) => api.updateTicket(id!, patch as never),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["support"] }),
    onError: (err) =>
      Alert.alert(
        t("support.updateFailed"),
        err instanceof Error ? err.message : t("common.tryAgain"),
      ),
  });

  const ticket = ticketQ.data;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: ticket ? `#${ticket.id.slice(0, 6)}` : t("support.detailFallbackTitle"),
          headerStyle: { backgroundColor: colors.dark.bg },
          headerTintColor: colors.text.light,
        }}
      />
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {ticketQ.isLoading || !ticket ? (
          <ActivityIndicator color={colors.brand.poolBlue} style={{ marginTop: 24 }} />
        ) : (
          <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 200, gap: 12 }}>
            <View style={styles.heroCard}>
              <View style={styles.heroTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.subject}>{ticket.subject}</Text>
                  <Text style={styles.meta}>
                    {ticket.user?.name ?? ticket.user?.phone ?? t("support.detailCustomer")} ·{" "}
                    {ticket.category ?? t("support.generalCategory")}
                  </Text>
                  <Text style={styles.date}>{new Date(ticket.createdAt).toLocaleString()}</Text>
                </View>
                <View
                  style={[styles.priorityChip, { borderColor: PRIORITY_COLOR[ticket.priority] }]}
                >
                  <View
                    style={[
                      styles.priorityDot,
                      { backgroundColor: PRIORITY_COLOR[ticket.priority] },
                    ]}
                  />
                  <Text
                    style={[
                      styles.priorityText,
                      { color: PRIORITY_COLOR[ticket.priority], letterSpacing: track(0.5) },
                    ]}
                  >
                    {PRIORITY_KEY[ticket.priority as keyof typeof PRIORITY_KEY]
                      ? t(PRIORITY_KEY[ticket.priority as keyof typeof PRIORITY_KEY])
                      : ticket.priority}
                  </Text>
                </View>
              </View>
              {ticket.agent?.name ? (
                <Text style={styles.assigned}>
                  {t("support.assignedTo")} {ticket.agent.name}
                </Text>
              ) : (
                <Text style={styles.unassigned}>{t("support.unassigned")}</Text>
              )}
            </View>

            {ticket.message && (
              <View style={styles.card}>
                <Text style={[styles.sectionTitle, { letterSpacing: track(1) }]}>
                  {t("support.customerMessage")}
                </Text>
                <Text style={styles.body}>{ticket.message}</Text>
              </View>
            )}

            <View style={styles.card}>
              <Text style={[styles.sectionTitle, { letterSpacing: track(1) }]}>
                {t("support.priority")}
              </Text>
              <View style={styles.chipRow}>
                {PRIORITIES.map((p) => (
                  <Pressable
                    key={p}
                    onPress={() => update.mutate({ priority: p })}
                    style={[
                      styles.chip,
                      ticket.priority === p && {
                        backgroundColor: PRIORITY_COLOR[p],
                        borderColor: PRIORITY_COLOR[p],
                      },
                    ]}
                  >
                    <Text style={[styles.chipText, ticket.priority === p && { color: "#fff" }]}>
                      {PRIORITY_KEY[p as keyof typeof PRIORITY_KEY]
                        ? t(PRIORITY_KEY[p as keyof typeof PRIORITY_KEY])
                        : p}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.card}>
              <Text style={[styles.sectionTitle, { letterSpacing: track(1) }]}>
                {t("support.status")}
              </Text>
              <View style={styles.chipRow}>
                {STATUSES.map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => update.mutate({ status: s })}
                    style={[
                      styles.chip,
                      ticket.status === s && {
                        backgroundColor: colors.brand.poolBlue,
                        borderColor: colors.brand.poolBlue,
                      },
                    ]}
                  >
                    <Text style={[styles.chipText, ticket.status === s && { color: "#000" }]}>
                      {STATUS_KEY[s as keyof typeof STATUS_KEY]
                        ? t(STATUS_KEY[s as keyof typeof STATUS_KEY])
                        : s.replace("_", " ").replace("-", " ")}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.actionRow}>
              <Pressable
                style={[styles.assignBtn, { flex: 1 }]}
                onPress={() => setAssignOpen(true)}
              >
                <Ionicons name="person-add" size={14} color="#fff" />
                <Text style={styles.assignText}>
                  {ticket.agent?.name ? t("support.reassign") : t("support.assign")}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.closeBtn, { flex: 1 }]}
                onPress={() =>
                  Alert.alert(t("support.closeTitle"), t("support.closeMessage"), [
                    { text: t("common.cancel"), style: "cancel" },
                    {
                      text: t("support.close"),
                      onPress: () => update.mutate({ status: "closed" }),
                    },
                  ])
                }
              >
                <Ionicons name="checkmark-done" size={14} color="#000" />
                <Text style={styles.closeText}>{t("support.close")}</Text>
              </Pressable>
            </View>

            <View style={styles.card}>
              <Text style={[styles.sectionTitle, { letterSpacing: track(1) }]}>
                {t("support.replyTitle")}
              </Text>
              <TextInput
                value={reply}
                onChangeText={setReply}
                multiline
                placeholder={t("support.replyPlaceholder")}
                placeholderTextColor={colors.text.secondary}
                style={styles.replyInput}
              />
              <Pressable
                style={[styles.sendBtn, !reply.trim() && { opacity: 0.4 }]}
                disabled={!reply.trim()}
                onPress={() => {
                  const userId = ticket.user?.id ?? ticket.userId;
                  if (!userId) {
                    Alert.alert(t("support.noRecipient"));
                    return;
                  }
                  api
                    .sendMessage(userId, reply.trim())
                    .then(() => {
                      setReply("");
                      Alert.alert(t("support.sentTitle"), t("support.sentMessage"));
                    })
                    .catch((err) =>
                      Alert.alert(
                        t("support.sendFailed"),
                        err instanceof Error ? err.message : t("common.tryAgain"),
                      ),
                    );
                }}
              >
                <Ionicons name="send" size={14} color="#000" />
                <Text style={styles.sendBtnText}>{t("support.sendReply")}</Text>
              </Pressable>
            </View>
          </ScrollView>
        )}

        <Modal
          visible={assignOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setAssignOpen(false)}
        >
          <Pressable style={styles.modalBg} onPress={() => setAssignOpen(false)}>
            <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.modalTitle}>{t("support.pickAgent")}</Text>
              {agentsQ.isLoading ? (
                <ActivityIndicator color={colors.brand.poolBlue} />
              ) : (
                <FlatList
                  data={agentsQ.data ?? []}
                  keyExtractor={(a) => a.id}
                  ListEmptyComponent={<Text style={styles.emptyText}>{t("support.noAgents")}</Text>}
                  renderItem={({ item }) => (
                    <Pressable
                      style={styles.agentRow}
                      onPress={() => {
                        update.mutate({ assignedAgentId: item.id });
                        setAssignOpen(false);
                      }}
                    >
                      <Ionicons name="person-circle" size={28} color={colors.brand.poolBlue} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.agentName}>
                          {item.name ?? t("support.ticketsAgent")}
                        </Text>
                        <Text style={styles.agentPhone}>{item.phone ?? ""}</Text>
                      </View>
                    </Pressable>
                  )}
                />
              )}
            </Pressable>
          </Pressable>
        </Modal>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.dark.bg },
  heroCard: {
    backgroundColor: colors.dark.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: 14,
    gap: 8,
  },
  heroTop: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  subject: { color: colors.text.light, fontSize: 17, fontWeight: "800" },
  meta: { color: colors.text.secondary, fontSize: 12, marginTop: 2 },
  date: { color: colors.text.secondary, fontSize: 10, marginTop: 2 },
  priorityChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  priorityDot: { width: 6, height: 6, borderRadius: 3 },
  priorityText: { fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
  assigned: { color: colors.brand.poolBlue, fontSize: 11, fontWeight: "700" },
  unassigned: { color: "#F5B800", fontSize: 11, fontWeight: "700" },
  card: {
    backgroundColor: colors.dark.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: 12,
    gap: 8,
  },
  sectionTitle: { color: colors.text.secondary, fontSize: 11, fontWeight: "700" },
  body: { color: colors.text.light, fontSize: 14, lineHeight: 20 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.dark.bg,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  chipText: {
    color: colors.text.secondary,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  actionRow: { flexDirection: "row", gap: 8 },
  assignBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.brand.friendlyBlue,
    borderRadius: 10,
    paddingVertical: 11,
  },
  assignText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  closeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.brand.ecoLimelight ?? "#A9F453",
    borderRadius: 10,
    paddingVertical: 11,
  },
  closeText: { color: "#000", fontWeight: "800", fontSize: 13 },
  replyInput: {
    backgroundColor: colors.dark.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: 12,
    color: colors.text.light,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: "top",
  },
  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.brand.poolBlue,
    borderRadius: 10,
    paddingVertical: 10,
  },
  sendBtnText: { color: "#000", fontWeight: "700" },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
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
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  agentName: { color: colors.text.light, fontSize: 14, fontWeight: "700" },
  agentPhone: { color: colors.text.secondary, fontSize: 11 },
  emptyText: {
    color: colors.text.secondary,
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 20,
  },
});
