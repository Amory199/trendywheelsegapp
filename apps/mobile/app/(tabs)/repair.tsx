import { colors, spacing, typography, borderRadius } from "@trendywheels/ui-tokens";
import { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { getAccessToken } from "../../lib/api";

const baseUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

export default function RepairScreen(): JSX.Element {
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<"mechanical" | "electrical" | "cosmetic" | "other">(
    "mechanical",
  );
  const [submitting, setSubmitting] = useState(false);

  const submit = async (): Promise<void> => {
    setSubmitting(true);
    try {
      const token = await getAccessToken();
      const res = await fetch(`${baseUrl}/api/repairs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ description, category, priority: "medium" }),
      });
      if (!res.ok) throw new Error("Submit failed");
      Alert.alert("Submitted", "We'll be in touch soon.");
      setDescription("");
    } catch (err) {
      Alert.alert("Failed", err instanceof Error ? err.message : "Try again");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}>
      <Text style={styles.title}>Request a repair</Text>
      <Text style={styles.subtitle}>Tell us what's wrong and our team will follow up.</Text>

      <Text style={styles.label}>Category</Text>
      <View style={styles.row}>
        {(["mechanical", "electrical", "cosmetic", "other"] as const).map((c) => (
          <TouchableOpacity
            key={c}
            style={[styles.chip, category === c && styles.chipActive]}
            onPress={() => setCategory(c)}
          >
            <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={styles.input}
        multiline
        numberOfLines={5}
        placeholder="Describe the issue…"
        placeholderTextColor={colors.text.placeholder}
        value={description}
        onChangeText={setDescription}
      />

      <TouchableOpacity
        style={[styles.button, (!description || submitting) && styles.buttonDisabled]}
        disabled={!description || submitting}
        onPress={() => void submit()}
      >
        <Text style={styles.buttonText}>{submitting ? "Submitting…" : "Submit request"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  title: {
    paddingTop: 40,
    fontSize: typography.fontSize.h1,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.light,
  },
  subtitle: { color: colors.text.secondary, marginTop: 4, marginBottom: spacing.lg },
  label: { color: colors.text.secondary, marginTop: spacing.md, marginBottom: spacing.xs },
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.dark.border,
    backgroundColor: colors.dark.card,
  },
  chipActive: { backgroundColor: colors.accent.DEFAULT, borderColor: colors.accent.DEFAULT },
  chipText: { color: colors.text.secondary, fontSize: 12 },
  chipTextActive: { color: colors.dark.bg, fontWeight: "700" },
  input: {
    backgroundColor: colors.dark.card,
    borderColor: colors.dark.border,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.text.light,
    minHeight: 120,
    textAlignVertical: "top",
  },
  button: {
    marginTop: spacing.lg,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.accent.DEFAULT,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: colors.dark.bg, fontWeight: "700" },
});
