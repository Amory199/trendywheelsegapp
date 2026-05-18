import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { api } from "../../../lib/api";

const SOURCES = ["walk-in", "phone", "whatsapp", "instagram", "facebook", "referral", "other"];

export default function NewLead(): React.JSX.Element {
  const router = useRouter();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    source: "phone",
    estimatedValue: "",
    notes: "",
  });

  const create = useMutation({
    mutationFn: async () =>
      api.crmCreateLead({
        contactName: form.contactName.trim(),
        contactPhone: form.contactPhone.trim() || undefined,
        contactEmail: form.contactEmail.trim() || undefined,
        source: form.source,
        estimatedValue: form.estimatedValue ? Number(form.estimatedValue) : 0,
        notes: form.notes.trim() || undefined,
      }),
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: ["crm"] });
      const id = (res.data as { id?: string })?.id;
      if (id) router.replace(`/crm/leads/${id}`);
      else router.back();
    },
    onError: (e) => Alert.alert("Create failed", e instanceof Error ? e.message : "Try again"),
  });

  const canSubmit = form.contactName.trim().length > 0;

  return (
    <>
      <Stack.Screen
        options={{
          title: "New lead",
          headerStyle: { backgroundColor: colors.dark.bg },
          headerTintColor: colors.text.light,
        }}
      />
      <View style={styles.root}>
        <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 200, gap: 12 }}>
          <Field
            label="Contact name *"
            value={form.contactName}
            onChange={(v) => setForm((s) => ({ ...s, contactName: v }))}
          />
          <Field
            label="Phone"
            value={form.contactPhone}
            onChange={(v) => setForm((s) => ({ ...s, contactPhone: v }))}
            keyboardType="phone-pad"
          />
          <Field
            label="Email"
            value={form.contactEmail}
            onChange={(v) => setForm((s) => ({ ...s, contactEmail: v }))}
            keyboardType="email-address"
          />
          <View style={styles.card}>
            <Text style={styles.label}>Source</Text>
            <View style={styles.chipRow}>
              {SOURCES.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => setForm((f) => ({ ...f, source: s }))}
                  style={[styles.chip, form.source === s && styles.chipActive]}
                >
                  <Text style={[styles.chipText, form.source === s && styles.chipTextActive]}>
                    {s}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <Field
            label="Estimated value (EGP)"
            value={form.estimatedValue}
            onChange={(v) => setForm((s) => ({ ...s, estimatedValue: v }))}
            keyboardType="numeric"
          />
          <Field
            label="Notes"
            value={form.notes}
            onChange={(v) => setForm((s) => ({ ...s, notes: v }))}
            multiline
          />

          <Pressable
            style={[styles.saveBtn, (!canSubmit || create.isPending) && { opacity: 0.5 }]}
            disabled={!canSubmit || create.isPending}
            onPress={() => create.mutate()}
          >
            <Ionicons name="checkmark-circle" size={18} color="#fff" />
            <Text style={styles.saveBtnText}>{create.isPending ? "Creating…" : "Create lead"}</Text>
          </Pressable>
        </ScrollView>
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
        placeholderTextColor={colors.text.secondary}
        style={[styles.input, multiline && { minHeight: 80, textAlignVertical: "top" }]}
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
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.dark.bg,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  chipActive: { backgroundColor: colors.brand.trendyPink, borderColor: colors.brand.trendyPink },
  chipText: {
    color: colors.text.secondary,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "capitalize",
  },
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
