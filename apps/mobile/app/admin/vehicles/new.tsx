import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "../../../lib/api";

const CATEGORIES = ["golf-cart", "scooter", "jet-ski", "buggy", "utv", "hover-board"];
const TYPES = ["electric", "petrol", "manual", "automatic"];

export default function AdminVehicleNew(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
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
    type: "electric",
    seating: "2",
    dailyRate: "",
    location: "Cairo",
  });

  const create = useMutation({
    mutationFn: async () =>
      api.createVehicle({
        name: form.name,
        category: form.category,
        type: form.type,
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
    onError: (e) => Alert.alert("Create failed", e instanceof Error ? e.message : "Try again"),
  });

  const canSubmit = form.name.trim().length > 0 && form.dailyRate.trim().length > 0;

  return (
    <>
      <Stack.Screen
        options={{
          title: "New vehicle",
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
            label="Name"
            value={form.name}
            onChange={(v) => setForm((s) => ({ ...s, name: v }))}
          />
          <Picker
            label="Category"
            options={CATEGORIES}
            value={form.category}
            onChange={(v) => setForm((s) => ({ ...s, category: v }))}
          />
          <Picker
            label="Type"
            options={TYPES}
            value={form.type}
            onChange={(v) => setForm((s) => ({ ...s, type: v }))}
          />
          <Field
            label="Seating"
            value={form.seating}
            keyboardType="numeric"
            onChange={(v) => setForm((s) => ({ ...s, seating: v }))}
          />
          <Field
            label="Daily rate (EGP)"
            value={form.dailyRate}
            keyboardType="numeric"
            onChange={(v) => setForm((s) => ({ ...s, dailyRate: v }))}
          />
          <Field
            label="Location"
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
              {create.isPending ? "Creating…" : "Create vehicle"}
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
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
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
            <Text style={[styles.chipText, value === opt && styles.chipTextActive]}>{opt}</Text>
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
