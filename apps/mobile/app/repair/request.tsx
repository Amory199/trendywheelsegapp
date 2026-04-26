import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { borderRadius, colors, spacing, typography } from "@trendywheels/ui-tokens";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { api } from "../../lib/api";

type Category = "mechanical" | "electrical" | "cosmetic" | "other";
type Priority = "low" | "medium" | "high" | "urgent";

const CATEGORIES: { key: Category; icon: React.ComponentProps<typeof Ionicons>["name"]; label: string }[] = [
  { key: "mechanical", icon: "settings-outline", label: "Mechanical" },
  { key: "electrical", icon: "flash-outline", label: "Electrical" },
  { key: "cosmetic", icon: "color-palette-outline", label: "Cosmetic" },
  { key: "other", icon: "construct-outline", label: "Other" },
];

const PRIORITIES: { key: Priority; label: string; color: string }[] = [
  { key: "low", label: "Low", color: colors.success },
  { key: "medium", label: "Medium", color: colors.warning },
  { key: "high", label: "High", color: "#F97316" },
  { key: "urgent", label: "Urgent", color: "#EF4444" },
];

export default function RepairRequestScreen(): JSX.Element {
  const router = useRouter();
  const qc = useQueryClient();
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("mechanical");
  const [priority, setPriority] = useState<Priority>("medium");
  const [preferredDate, setPreferredDate] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      api.createRepairRequest({
        description,
        category,
        priority,
      }),
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void qc.invalidateQueries({ queryKey: ["repair-requests"] });
      router.back();
    },
  });

  const canSubmit = description.length >= 10 && !mutation.isPending;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.text.light} />
        </Pressable>
        <Text style={styles.title}>New Repair Request</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: 120 }}>
        {/* Category */}
        <Animated.View entering={FadeInDown.delay(50).springify()}>
          <Text style={styles.label}>Issue Category</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((c) => (
              <Pressable
                key={c.key}
                style={[styles.categoryCard, category === c.key && styles.categoryCardActive]}
                onPress={() => setCategory(c.key)}
              >
                <Ionicons
                  name={c.icon}
                  size={28}
                  color={category === c.key ? colors.accent.DEFAULT : colors.text.secondary}
                />
                <Text style={[styles.categoryLabel, category === c.key && styles.categoryLabelActive]}>
                  {c.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {/* Description */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <Text style={styles.label}>Describe the Issue</Text>
          <TextInput
            style={styles.textarea}
            multiline
            numberOfLines={5}
            placeholder="Describe what's wrong in detail (min 10 characters)…"
            placeholderTextColor={colors.text.secondary}
            value={description}
            onChangeText={setDescription}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{description.length} / 500</Text>
        </Animated.View>

        {/* Priority */}
        <Animated.View entering={FadeInDown.delay(150).springify()}>
          <Text style={styles.label}>Priority</Text>
          <View style={styles.priorityRow}>
            {PRIORITIES.map((p) => (
              <Pressable
                key={p.key}
                style={[
                  styles.priorityBtn,
                  { borderColor: p.color },
                  priority === p.key && { backgroundColor: `${p.color}22` },
                ]}
                onPress={() => setPriority(p.key)}
              >
                <Text style={[styles.priorityLabel, { color: p.color }]}>{p.label}</Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {/* Preferred Date (optional) */}
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <Text style={styles.label}>Preferred Date (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.text.secondary}
            value={preferredDate}
            onChangeText={setPreferredDate}
          />
        </Animated.View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
          disabled={!canSubmit}
          onPress={() => mutation.mutate()}
        >
          {mutation.isPending ? (
            <ActivityIndicator color="#000" />
          ) : (
            <>
              <Ionicons name="send-outline" size={18} color="#000" />
              <Text style={styles.submitBtnText}>Submit Request</Text>
            </>
          )}
        </Pressable>
        {mutation.isError && (
          <Text style={styles.errorText}>Submission failed. Please try again.</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 56,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: { color: colors.text.light, fontSize: 16, fontWeight: "700" },
  label: { color: colors.text.secondary, fontSize: 13, marginBottom: spacing.sm },
  categoryGrid: { flexDirection: "row", gap: spacing.sm },
  categoryCard: {
    flex: 1,
    backgroundColor: colors.dark.card,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 2,
    borderColor: colors.dark.border,
  },
  categoryCardActive: { borderColor: colors.accent.DEFAULT },
  categoryLabel: { color: colors.text.secondary, fontSize: 11, fontWeight: "600" },
  categoryLabelActive: { color: colors.accent.DEFAULT },
  textarea: {
    backgroundColor: colors.dark.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: spacing.md,
    color: colors.text.light,
    fontSize: 14,
    minHeight: 120,
  },
  charCount: { color: colors.text.secondary, fontSize: 11, textAlign: "right", marginTop: 4 },
  priorityRow: { flexDirection: "row", gap: spacing.sm },
  priorityBtn: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  priorityLabel: { fontWeight: "700", fontSize: 13 },
  input: {
    backgroundColor: colors.dark.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.dark.border,
    height: 48,
    paddingHorizontal: spacing.md,
    color: colors.text.light,
    fontSize: 15,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    backgroundColor: colors.dark.bg,
    borderTopWidth: 1,
    borderTopColor: colors.dark.border,
  },
  submitBtn: {
    flexDirection: "row",
    backgroundColor: colors.accent.DEFAULT,
    borderRadius: borderRadius.md,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm,
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { color: "#000", fontWeight: "700", fontSize: 16 },
  errorText: { color: colors.error, textAlign: "center", marginTop: spacing.sm, fontSize: 13 },
});
