import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { borderRadius, colors, spacing, typography } from "@trendywheels/ui-tokens";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { GuestGate } from "../../components/GuestGate";
import { logEvent } from "../../lib/analytics";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-store";
import { useT } from "../../lib/locale";
import { playSound } from "../../lib/sounds";

type Category = "mechanical" | "electrical" | "cosmetic" | "other";
type Priority = "low" | "medium" | "high" | "urgent";

const CATEGORIES: {
  key: Category;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  labelKey: string;
}[] = [
  { key: "mechanical", icon: "settings-outline", labelKey: "service.request.catMechanical" },
  { key: "electrical", icon: "flash-outline", labelKey: "service.request.catElectrical" },
  { key: "cosmetic", icon: "color-palette-outline", labelKey: "service.request.catCosmetic" },
  { key: "other", icon: "construct-outline", labelKey: "service.request.catOther" },
];

const PRIORITIES: { key: Priority; labelKey: string; color: string }[] = [
  { key: "low", labelKey: "service.request.prioLow", color: colors.success },
  { key: "medium", labelKey: "service.request.prioMedium", color: colors.warning },
  { key: "high", labelKey: "service.request.prioHigh", color: "#F97316" },
  { key: "urgent", labelKey: "service.request.prioUrgent", color: "#EF4444" },
];

export default function RepairRequestScreen(): JSX.Element {
  const router = useRouter();
  const qc = useQueryClient();
  const t = useT();
  const user = useAuth((s) => s.user);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("mechanical");
  const [priority, setPriority] = useState<Priority>("medium");
  // Preferred date now comes from a calendar picker, not free-text — eliminates
  // the "YYYY-MM-DD" typing that was both painful and a silent validation
  // hazard. ISO string goes into the payload only if set.
  const [preferredDate, setPreferredDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const onPreferredDateChange = (event: DateTimePickerEvent, selected?: Date): void => {
    if (Platform.OS !== "ios") setShowDatePicker(false);
    if (event.type === "set" && selected) setPreferredDate(selected);
  };

  const mutation = useMutation({
    mutationFn: () =>
      api.createRepairRequest({
        description,
        category,
        priority,
        ...(preferredDate ? { preferredDate: preferredDate.toISOString() } : {}),
      }),
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      playSound("success");
      logEvent("repair_requested", { category });
      void qc.invalidateQueries({ queryKey: ["repair-requests"] });
      router.back();
    },
    onError: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      playSound("error");
    },
  });

  const canSubmit = description.length >= 10 && !mutation.isPending;

  if (!user) return <GuestGate />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.text.light} />
        </Pressable>
        <Text style={styles.title}>{t("service.request.title")}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: 120 }}
      >
        {/* Category */}
        <Animated.View entering={FadeInDown.delay(50).springify()}>
          <Text style={styles.label}>{t("service.request.issueCategory")}</Text>
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
                <Text
                  numberOfLines={1}
                  style={[styles.categoryLabel, category === c.key && styles.categoryLabelActive]}
                >
                  {t(c.labelKey)}
                </Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {/* Description */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <Text style={styles.label}>{t("service.request.describeIssue")}</Text>
          <TextInput
            style={styles.textarea}
            multiline
            numberOfLines={5}
            placeholder={t("service.request.descriptionPlaceholder")}
            placeholderTextColor={colors.text.secondary}
            value={description}
            onChangeText={setDescription}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{description.length} / 500</Text>
        </Animated.View>

        {/* Priority */}
        <Animated.View entering={FadeInDown.delay(150).springify()}>
          <Text style={styles.label}>{t("service.request.priority")}</Text>
          <View style={styles.priorityRow}>
            {PRIORITIES.map((p) => {
              const selected = priority === p.key;
              return (
                <Pressable
                  key={p.key}
                  style={[
                    styles.priorityBtn,
                    selected
                      ? { backgroundColor: p.color, borderColor: p.color }
                      : { backgroundColor: colors.dark.card, borderColor: `${p.color}55` },
                  ]}
                  onPress={() => setPriority(p.key)}
                >
                  <Text style={[styles.priorityLabel, { color: selected ? "#fff" : p.color }]}>
                    {t(p.labelKey)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        {/* Preferred Date (optional) — calendar picker, never free text */}
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <Text style={styles.label}>{t("service.request.preferredDate")}</Text>
          <Pressable style={styles.input} onPress={() => setShowDatePicker(true)}>
            <Text
              style={{
                color: preferredDate ? colors.text.light : colors.text.secondary,
                fontSize: 15,
                lineHeight: 48,
              }}
            >
              {preferredDate ? preferredDate.toLocaleDateString() : t("service.request.pickDate")}
            </Text>
            <Ionicons
              name="calendar-outline"
              size={18}
              color={colors.text.secondary}
              style={{ position: "absolute", right: spacing.md, top: 15 }}
            />
          </Pressable>
          {showDatePicker ? (
            <DateTimePicker
              value={preferredDate ?? new Date()}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              minimumDate={new Date()}
              onChange={onPreferredDateChange}
            />
          ) : null}
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
              <Text style={styles.submitBtnText}>{t("service.request.submit")}</Text>
            </>
          )}
        </Pressable>
        {mutation.isError && (
          <Text style={styles.errorText}>{t("service.request.submissionFailed")}</Text>
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
  // 2x2 grid instead of 4-up row so labels like "Mechanical" / "Electrical"
  // fit on one line without mid-word wrap.
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  categoryCard: {
    width: "47%",
    backgroundColor: colors.dark.card,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 2,
    borderColor: colors.dark.border,
  },
  categoryCardActive: { borderColor: colors.accent.DEFAULT },
  categoryLabel: { color: colors.text.secondary, fontSize: 13, fontWeight: "600" },
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
    backgroundColor: colors.dark.card,
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
