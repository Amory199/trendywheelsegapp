import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "../../lib/api";
import { useT } from "../../lib/locale";

interface SystemConfig {
  companyName?: string;
  companyEmail?: string | null;
  companyPhone?: string | null;
  companyAddress?: string | null;
  companyHours?: string | null;
  currency?: string;
  taxRatePct?: number;
}

const CURRENCIES = ["EGP", "USD", "EUR"];

export default function AdminSystemConfig(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const t = useT();
  const [form, setForm] = useState<SystemConfig>({});

  const q = useQuery({
    queryKey: ["admin", "system-config"],
    queryFn: async () => {
      const r = await api.adminGetSystemConfig();
      return (r as { data: SystemConfig }).data;
    },
  });

  useEffect(() => {
    if (q.data) setForm(q.data);
  }, [q.data]);

  const save = useMutation({
    mutationFn: async () => api.adminUpdateSystemConfig(form as Record<string, unknown>),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin", "system-config"] });
      Alert.alert(t("admin.configSavedTitle"), t("admin.configSavedMessage"));
    },
    onError: (e) =>
      Alert.alert(t("admin.saveFailed"), e instanceof Error ? e.message : t("admin.tryAgain")),
  });

  return (
    <>
      <Stack.Screen
        options={{
          title: t("admin.configTitle"),
          headerStyle: { backgroundColor: colors.dark.bg },
          headerTintColor: colors.text.light,
        }}
      />
      <View style={styles.root}>
        {q.isLoading ? (
          <ActivityIndicator color={colors.brand.friendlyBlue} style={{ marginTop: 40 }} />
        ) : (
          <ScrollView
            contentContainerStyle={{
              padding: 14,
              paddingTop: insets.top + 14,
              paddingBottom: 200,
              gap: 12,
            }}
          >
            <Field
              label={t("admin.configCompanyName")}
              value={form.companyName ?? ""}
              onChange={(v) => setForm((s) => ({ ...s, companyName: v }))}
            />
            <Field
              label={t("admin.configEmail")}
              value={form.companyEmail ?? ""}
              onChange={(v) => setForm((s) => ({ ...s, companyEmail: v }))}
              keyboardType="email-address"
            />
            <Field
              label={t("admin.configPhone")}
              value={form.companyPhone ?? ""}
              onChange={(v) => setForm((s) => ({ ...s, companyPhone: v }))}
              keyboardType="phone-pad"
            />
            <Field
              label={t("admin.configAddress")}
              value={form.companyAddress ?? ""}
              onChange={(v) => setForm((s) => ({ ...s, companyAddress: v }))}
              multiline
            />
            <Field
              label={t("admin.configBusinessHours")}
              value={form.companyHours ?? ""}
              onChange={(v) => setForm((s) => ({ ...s, companyHours: v }))}
            />
            <Field
              label={t("admin.configTaxRate")}
              value={form.taxRatePct?.toString() ?? ""}
              onChange={(v) => setForm((s) => ({ ...s, taxRatePct: Number(v) }))}
              keyboardType="numeric"
            />

            <View style={styles.card}>
              <Text style={styles.label}>{t("admin.configCurrency")}</Text>
              <View style={styles.chipRow}>
                {CURRENCIES.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setForm((s) => ({ ...s, currency: c }))}
                    style={[styles.chip, form.currency === c && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, form.currency === c && styles.chipTextActive]}>
                      {c}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <Pressable
              style={[styles.saveBtn, save.isPending && { opacity: 0.5 }]}
              disabled={save.isPending}
              onPress={() => save.mutate()}
            >
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={styles.saveBtnText}>
                {save.isPending ? t("admin.configSaving") : t("admin.configSaveChanges")}
              </Text>
            </Pressable>
          </ScrollView>
        )}
      </View>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  keyboardType,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  keyboardType?: "default" | "numeric" | "email-address" | "phone-pad";
  multiline?: boolean;
}): React.JSX.Element {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType ?? "default"}
        multiline={multiline}
        style={[styles.input, multiline && { minHeight: 60, textAlignVertical: "top" }]}
        placeholderTextColor={colors.text.secondary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.dark.bg },
  card: {
    backgroundColor: colors.dark.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: 12,
    gap: 8,
  },
  label: { color: colors.text.secondary, fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  input: { color: colors.text.light, fontSize: 15, paddingVertical: 4 },
  chipRow: { flexDirection: "row", gap: 6 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.dark.bg,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  chipActive: {
    backgroundColor: colors.brand.friendlyBlue,
    borderColor: colors.brand.friendlyBlue,
  },
  chipText: { color: colors.text.secondary, fontSize: 11, fontWeight: "700" },
  chipTextActive: { color: "#fff" },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.brand.trendyPink,
    borderRadius: 12,
    paddingVertical: 14,
  },
  saveBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },
});
