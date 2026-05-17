import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import { Stack, useRouter } from "expo-router";
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

import { api } from "../../lib/api";

const KINDS = [
  { key: "paint", label: "Paint / wrap" },
  { key: "lights", label: "Lights" },
  { key: "wrap", label: "Vinyl wrap" },
  { key: "audio", label: "Audio" },
  { key: "other", label: "Other" },
] as const;

type Kind = (typeof KINDS)[number]["key"];

export default function CustomizationScreen(): JSX.Element {
  const router = useRouter();
  const qc = useQueryClient();
  const [kind, setKind] = useState<Kind>("paint");
  const [budget, setBudget] = useState("");
  const [notes, setNotes] = useState("");

  const submit = useMutation({
    mutationFn: () =>
      api.request("POST", "/api/service/customization", {
        body: {
          kind,
          budget: budget ? Number(budget) : undefined,
          notes: notes || undefined,
        },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["service", "customization"] });
      Alert.alert("Request received", "We'll send you concept options shortly.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    },
    onError: (err) =>
      Alert.alert("Couldn't submit", err instanceof Error ? err.message : "Try again"),
  });

  return (
    <>
      <Stack.Screen
        options={{
          title: "Customization",
          headerStyle: { backgroundColor: colors.dark.bg },
          headerTintColor: colors.text.light,
        }}
      />
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.intro}>
            <Ionicons name="color-palette" size={32} color={colors.brand.poolBlue} />
            <Text style={styles.title}>Make it yours</Text>
            <Text style={styles.subtitle}>
              Tell us what you have in mind. Paint, wrap, lights, audio — we'll come back with
              concept options.
            </Text>
          </View>

          <Text style={styles.label}>Customization type</Text>
          <View style={styles.chipRow}>
            {KINDS.map((k) => {
              const active = kind === k.key;
              return (
                <Pressable
                  key={k.key}
                  onPress={() => setKind(k.key)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{k.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>Budget (EGP, optional)</Text>
          <TextInput
            value={budget}
            onChangeText={(v) => setBudget(v.replace(/[^0-9]/g, ""))}
            placeholder="e.g. 25000"
            placeholderTextColor={colors.text.secondary}
            keyboardType="number-pad"
            style={styles.input}
          />

          <Text style={styles.label}>Your idea</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="What do you have in mind?"
            placeholderTextColor={colors.text.secondary}
            multiline
            style={[styles.input, styles.textarea]}
          />

          <Pressable
            disabled={submit.isPending}
            onPress={() => submit.mutate()}
            style={[styles.submitBtn, submit.isPending && { opacity: 0.5 }]}
          >
            {submit.isPending ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <Ionicons name="checkmark" size={16} color="#000" />
                <Text style={styles.submitBtnText}>Submit request</Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.dark.bg },
  scroll: { padding: 20, paddingBottom: 80, gap: 14 },
  intro: { alignItems: "center", gap: 8, marginBottom: 12 },
  title: { color: colors.text.light, fontSize: 20, fontWeight: "800", textAlign: "center" },
  subtitle: { color: colors.text.secondary, fontSize: 13, textAlign: "center", lineHeight: 19 },
  label: {
    color: colors.text.secondary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 4,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: colors.dark.card,
    borderColor: colors.dark.border,
  },
  chipActive: { backgroundColor: colors.brand.poolBlue, borderColor: colors.brand.poolBlue },
  chipText: { color: colors.text.secondary, fontWeight: "700", fontSize: 12 },
  chipTextActive: { color: "#000" },
  input: {
    backgroundColor: colors.dark.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: 14,
    color: colors.text.light,
    fontSize: 14,
  },
  textarea: { minHeight: 100, textAlignVertical: "top" },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.brand.poolBlue,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 12,
  },
  submitBtnText: { color: "#000", fontWeight: "700" },
});
