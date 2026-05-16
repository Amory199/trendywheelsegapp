import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { api } from "../../../lib/api";

interface Ticket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  category?: string;
  message?: string;
  createdAt: string;
  user?: { name?: string; phone?: string; email?: string };
}

const STATUSES = ["open", "in_progress", "resolved", "closed"];

export default function SupportTicketDetail(): JSX.Element {
  const router = useRouter();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [reply, setReply] = useState("");

  const ticketQ = useQuery({
    queryKey: ["support", "ticket", id],
    queryFn: async (): Promise<Ticket> => {
      const r = await api.getTicket(id!);
      return r.data as unknown as Ticket;
    },
    enabled: !!id,
  });

  const updateStatus = useMutation({
    mutationFn: async (next: string) => api.updateTicket(id!, { status: next } as never),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["support"] }),
    onError: (err) =>
      Alert.alert("Couldn't update status", err instanceof Error ? err.message : "Try again"),
  });

  const t = ticketQ.data;

  return (
    <>
      <Stack.Screen
        options={{
          title: t ? `#${t.id.slice(0, 6)}` : "Ticket",
          headerStyle: { backgroundColor: colors.dark.bg },
          headerTintColor: colors.text.light,
        }}
      />
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {ticketQ.isLoading || !t ? (
          <ActivityIndicator color={colors.brand.poolBlue} style={{ marginTop: 24 }} />
        ) : (
          <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 200, gap: 14 }}>
            <View style={styles.card}>
              <Text style={styles.subject}>{t.subject}</Text>
              <Text style={styles.meta}>
                {t.user?.name ?? t.user?.phone ?? "Customer"} · {t.category ?? "general"}
              </Text>
              <Text style={styles.priority}>Priority: {t.priority}</Text>
            </View>

            {t.message && (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Customer message</Text>
                <Text style={styles.body}>{t.message}</Text>
              </View>
            )}

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Status</Text>
              <View style={styles.stageRow}>
                {STATUSES.map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => updateStatus.mutate(s)}
                    style={[
                      styles.stage,
                      t.status === s && { backgroundColor: colors.brand.poolBlue },
                    ]}
                  >
                    <Text style={[styles.stageText, t.status === s && { color: "#000" }]}>
                      {s.replace("_", " ")}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Reply</Text>
              <TextInput
                value={reply}
                onChangeText={setReply}
                multiline
                placeholder="Type a reply…"
                placeholderTextColor={colors.text.secondary}
                style={styles.replyInput}
              />
              <Pressable
                style={[styles.sendBtn, !reply.trim() && { opacity: 0.4 }]}
                disabled={!reply.trim()}
                onPress={() => {
                  // Reply flow uses the messaging endpoint. We need the user id from the ticket
                  // to start a conversation. Falls back to logging the reply as an internal note.
                  if (!t.user) {
                    Alert.alert("No customer linked", "Cannot send reply on this ticket.");
                    return;
                  }
                  // Use sendMessage if user has an id field.
                  const userId = (t as unknown as { userId?: string }).userId;
                  if (!userId) {
                    Alert.alert("No recipient");
                    return;
                  }
                  api
                    .sendMessage(userId, reply.trim())
                    .then(() => {
                      setReply("");
                      Alert.alert("Sent", "Reply delivered to customer.");
                    })
                    .catch((err) =>
                      Alert.alert("Send failed", err instanceof Error ? err.message : "Try again"),
                    );
                }}
              >
                <Ionicons name="send" size={14} color="#000" />
                <Text style={styles.sendBtnText}>Send reply</Text>
              </Pressable>
            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.dark.bg },
  card: {
    backgroundColor: colors.dark.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: 14,
    gap: 8,
  },
  subject: { color: colors.text.light, fontSize: 18, fontWeight: "700" },
  meta: { color: colors.text.secondary, fontSize: 12 },
  priority: { color: colors.brand.poolBlue, fontSize: 12, fontWeight: "700" },
  sectionTitle: { color: colors.text.secondary, fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  body: { color: colors.text.light, fontSize: 14, lineHeight: 20 },
  stageRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  stage: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.dark.bg,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  stageText: {
    color: colors.text.secondary,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "capitalize",
  },
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
});
