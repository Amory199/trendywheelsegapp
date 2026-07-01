import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "../../../lib/api";
import { useT } from "../../../lib/locale";

const CATEGORIES = ["golf-cart", "scooter", "jet-ski", "buggy", "utv", "hover-board"];
const TYPES = ["off-road", "on-road", "utility", "luxury"];

const CATEGORY_KEY: Record<
  string,
  | "admin.catGolfCart"
  | "admin.catScooter"
  | "admin.catJetSki"
  | "admin.catBuggy"
  | "admin.catUtv"
  | "admin.catHoverBoard"
> = {
  "golf-cart": "admin.catGolfCart",
  scooter: "admin.catScooter",
  "jet-ski": "admin.catJetSki",
  buggy: "admin.catBuggy",
  utv: "admin.catUtv",
  "hover-board": "admin.catHoverBoard",
};
const TYPE_KEY: Record<
  string,
  "admin.typeOffRoad" | "admin.typeOnRoad" | "admin.typeUtility" | "admin.typeLuxury"
> = {
  "off-road": "admin.typeOffRoad",
  "on-road": "admin.typeOnRoad",
  utility: "admin.typeUtility",
  luxury: "admin.typeLuxury",
};

export default function AdminVehicleNew(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const t = useT();
  const [form, setForm] = useState<{
    name: string;
    category: string;
    type: string;
    seating: string;
    dailyRate: string;
    location: string;
  }>({
    name: "",
    category: "golf-cart",
    type: "",
    seating: "2",
    dailyRate: "",
    location: "Cairo",
  });

  const create = useMutation({
    mutationFn: async () =>
      api.createVehicle({
        name: form.name,
        category: form.category,
        type: form.type || undefined,
        seating: Number(form.seating),
        dailyRate: Number(form.dailyRate),
        location: form.location,
      } as never),
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: ["admin"] });
      const id = (res as { data?: { id?: string } }).data?.id;
      if (id) router.replace(`/admin/vehicles/${id}`);
      else router.back();
    },
    onError: (e) =>
      Alert.alert(t("admin.createFailed"), e instanceof Error ? e.message : t("admin.tryAgain")),
  });

  const canSubmit = form.name.trim().length > 0 && form.dailyRate.trim().length > 0;

  return (
    <>
      <Stack.Screen
        options={{
          title: t("admin.newVehicleTitle"),
          headerStyle: { backgroundColor: colors.dark.bg },
          headerTintColor: colors.text.light,
        }}
      />
      <View style={styles.root}>
        <ScrollView
          contentContainerStyle={{
            padding: 14,
            paddingTop: insets.top + 14,
            paddingBottom: 200,
            gap: 12,
          }}
        >
          <Field
            label={t("admin.newFieldName")}
            value={form.name}
            onChange={(v) => setForm((s) => ({ ...s, name: v }))}
          />
          <Picker
            label={t("admin.newFieldCategory")}
            options={CATEGORIES}
            labelOf={(c) => (CATEGORY_KEY[c] ? t(CATEGORY_KEY[c]) : c)}
            value={form.category}
            onChange={(v) => setForm((s) => ({ ...s, category: v }))}
          />
          <Picker
            label={t("admin.newFieldType")}
            options={TYPES}
            labelOf={(ty) => (TYPE_KEY[ty] ? t(TYPE_KEY[ty]) : ty)}
            value={form.type}
            onChange={(v) => setForm((s) => ({ ...s, type: v }))}
          />
          <Field
            label={t("admin.newFieldSeating")}
            value={form.seating}
            keyboardType="numeric"
            onChange={(v) => setForm((s) => ({ ...s, seating: v }))}
          />
          <Field
            label={t("admin.newFieldDailyRate")}
            value={form.dailyRate}
            keyboardType="numeric"
            onChange={(v) => setForm((s) => ({ ...s, dailyRate: v }))}
          />
          <Field
            label={t("admin.newFieldLocation")}
            value={form.location}
            onChange={(v) => setForm((s) => ({ ...s, location: v }))}
          />

          <Pressable
            style={[styles.saveBtn, (!canSubmit || create.isPending) && { opacity: 0.5 }]}
            disabled={!canSubmit || create.isPending}
            onPress={() => create.mutate()}
          >
            <Ionicons name="checkmark-circle" size={18} color="#fff" />
            <Text style={styles.saveBtnText}>
              {create.isPending ? t("admin.newCreating") : t("admin.newCreateVehicle")}
            </Text>
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  keyboardType?: "default" | "numeric";
}): React.JSX.Element {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholderTextColor={colors.text.secondary}
        keyboardType={keyboardType ?? "default"}
        style={styles.input}
      />
    </View>
  );
}

function Picker({
  label,
  options,
  value,
  onChange,
  labelOf,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  labelOf?: (opt: string) => string;
}): React.JSX.Element {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.chipRow}>
        {options.map((opt) => (
          <Pressable
            key={opt}
            onPress={() => onChange(opt)}
            style={[styles.chip, value === opt && styles.chipActive]}
          >
            <Text style={[styles.chipText, value === opt && styles.chipTextActive]}>
              {labelOf ? labelOf(opt) : opt}
            </Text>
          </Pressable>
        ))}
      </View>
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
  chipActive: {
    backgroundColor: colors.brand.friendlyBlue,
    borderColor: colors.brand.friendlyBlue,
  },
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
