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
import { useT } from "../../lib/locale";
import { useTracking } from "../../lib/typography";

const KINDS = [
  { key: "paint", labelKey: "service.customization.kindPaint" },
  { key: "lights", labelKey: "service.customization.kindLights" },
  { key: "wrap", labelKey: "service.customization.kindWrap" },
  { key: "audio", labelKey: "service.customization.kindAudio" },
  { key: "other", labelKey: "service.customization.kindOther" },
] as const;

type Kind = (typeof KINDS)[number]["key"];

export default function CustomizationScreen(): JSX.Element {
  const router = useRouter();
  const qc = useQueryClient();
  const t = useT();
  const track = useTracking();
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
      Alert.alert(t("service.customization.successTitle"), t("service.customization.successBody"), [
        { text: t("common.confirm"), onPress: () => router.back() },
      ]);
    },
    onError: (err) =>
      Alert.alert(
        t("service.submitErrorTitle"),
        err instanceof Error ? err.message : t("service.submitErrorFallback"),
      ),
  });

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t("service.customization.headerTitle"),
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
            <Text style={styles.title}>{t("service.customization.intro")}</Text>
            <Text style={styles.subtitle}>{t("service.customization.subtitle")}</Text>
          </View>

          <Text style={[styles.label, { letterSpacing: track(1) }]}>
            {t("service.customization.typeLabel")}
          </Text>
          <View style={styles.chipRow}>
            {KINDS.map((k) => {
              const active = kind === k.key;
              return (
                <Pressable
                  key={k.key}
                  onPress={() => setKind(k.key)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {t(k.labelKey)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.label, { letterSpacing: track(1) }]}>
            {t("service.customization.budgetLabel")}
          </Text>
          <TextInput
            value={budget}
            onChangeText={(v) => setBudget(v.replace(/[^0-9]/g, ""))}
            placeholder={t("service.customization.budgetPlaceholder")}
            placeholderTextColor={colors.text.secondary}
            keyboardType="number-pad"
            style={styles.input}
          />

          <Text style={[styles.label, { letterSpacing: track(1) }]}>
            {t("service.customization.ideaLabel")}
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder={t("service.customization.ideaPlaceholder")}
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
                <Text style={styles.submitBtnText}>{t("service.customization.submit")}</Text>
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
