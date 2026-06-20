import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import {
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

import { GuestGate } from "../../../components/GuestGate";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/auth-store";
import { useT } from "../../../lib/locale";

const PRIORITIES = ["low", "medium", "high", "urgent"] as const;
const PRIORITY_COLOR: Record<string, string> = {
  urgent: "#FF3D6E",
  high: "#FF7A00",
  medium: "#F5B800",
  low: colors.brand.poolBlue,
};
const PRIORITY_KEY = {
  low: "support.priorityLow",
  medium: "support.priorityMedium",
  high: "support.priorityHigh",
  urgent: "support.priorityUrgent",
} as const;

// Customer-facing "open a new support request" form. Each submit creates a
// DISCRETE ticket with its own thread — never reopens a previous conversation.
export default function NewTicket(): JSX.Element {
  const router = useRouter();
  const qc = useQueryClient();
  const t = useT();
  const user = useAuth((s) => s.user);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<(typeof PRIORITIES)[number]>("medium");

  const create = useMutation({
    mutationFn: () =>
      api.createTicket({ subject: subject.trim(), message: message.trim(), priority }),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ["support", "tickets"] });
      const id = (res as { id?: string; data?: { id?: string } }).id ?? res.data?.id;
      if (id) router.replace(`/support/tickets/${id}`);
      else router.back();
    },
    onError: (err) =>
      Alert.alert(
        t("support.createFailed"),
        err instanceof Error ? err.message : t("common.tryAgain"),
      ),
  });

  if (!user) return <GuestGate />;

  const valid = subject.trim().length >= 5 && message.trim().length >= 10;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t("support.newRequest"),
          headerStyle: { backgroundColor: colors.dark.bg },
          headerTintColor: colors.text.light,
        }}
      />
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 16 }}>
          <Text style={styles.heading}>{t("support.newRequestTitle")}</Text>

          <View style={styles.field}>
            <Text style={styles.label}>{t("support.subjectLabel")}</Text>
            <TextInput
              value={subject}
              onChangeText={setSubject}
              placeholder={t("support.subjectPlaceholder")}
              placeholderTextColor={colors.text.secondary}
              style={styles.input}
              maxLength={200}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{t("support.messageLabel")}</Text>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder={t("support.messagePlaceholder")}
              placeholderTextColor={colors.text.secondary}
              style={[styles.input, styles.textarea]}
              multiline
              maxLength={2000}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{t("support.priority")}</Text>
            <View style={styles.chipRow}>
              {PRIORITIES.map((p) => (
                <Pressable
                  key={p}
                  onPress={() => setPriority(p)}
                  style={[
                    styles.chip,
                    priority === p && {
                      backgroundColor: PRIORITY_COLOR[p],
                      borderColor: PRIORITY_COLOR[p],
                    },
                  ]}
                >
                  <Text style={[styles.chipText, priority === p && { color: "#000" }]}>
                    {t(PRIORITY_KEY[p])}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Pressable
            style={[styles.submit, (!valid || create.isPending) && { opacity: 0.4 }]}
            disabled={!valid || create.isPending}
            onPress={() => create.mutate()}
          >
            <Ionicons name="send" size={16} color="#000" />
            <Text style={styles.submitText}>
              {create.isPending ? t("support.submitting") : t("support.submitRequest")}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.dark.bg },
  heading: { color: colors.text.light, fontSize: 20, fontWeight: "800" },
  field: { gap: 6 },
  label: {
    color: colors.text.secondary,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: colors.dark.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: 12,
    color: colors.text.light,
    fontSize: 15,
  },
  textarea: { minHeight: 120, textAlignVertical: "top" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  chipText: {
    color: colors.text.secondary,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  submit: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.brand.poolBlue,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 4,
  },
  submitText: { color: "#000", fontWeight: "800", fontSize: 15 },
});
