import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
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

import { api } from "../../../lib/api";

interface Vehicle {
  id: string;
  name: string;
  category: string;
  type?: string;
  seating?: number;
  fuelType?: string;
  transmission?: string;
  dailyRate?: number;
  location?: string;
  status?: string;
}

const VEHICLE_STATUSES = ["available", "rented", "maintenance", "inactive"];

export default function AdminVehicleEdit(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [form, setForm] = useState<Partial<Vehicle>>({});

  const q = useQuery({
    queryKey: ["admin", "vehicle", id],
    queryFn: async (): Promise<Vehicle> => {
      const r = await api.getVehicle(id!);
      return (r as { data: Vehicle }).data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (q.data) setForm(q.data);
  }, [q.data]);

  const save = useMutation({
    mutationFn: async () => api.updateVehicle(id!, form as never),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin"] });
      Alert.alert("Saved", "Vehicle updated.");
    },
    onError: (e) => Alert.alert("Save failed", e instanceof Error ? e.message : "Try again"),
  });

  const del = useMutation({
    mutationFn: async () => api.deleteVehicle(id!),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin"] });
      router.back();
    },
    onError: (e) => Alert.alert("Delete failed", e instanceof Error ? e.message : "Try again"),
  });

  const update = <K extends keyof Vehicle>(key: K, value: Vehicle[K]) =>
    setForm((s) => ({ ...s, [key]: value }));

  return (
    <>
      <Stack.Screen
        options={{
          title: form.name ?? "Vehicle",
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
            <Field label="Name" value={form.name} onChange={(v) => update("name", v)} />
            <Field label="Type" value={form.type} onChange={(v) => update("type", v)} />
            <Field label="Location" value={form.location} onChange={(v) => update("location", v)} />
            <Field
              label="Daily rate (EGP)"
              value={form.dailyRate?.toString()}
              keyboardType="numeric"
              onChange={(v) => update("dailyRate", Number(v) as never)}
            />
            <Field
              label="Seating"
              value={form.seating?.toString()}
              keyboardType="numeric"
              onChange={(v) => update("seating", Number(v) as never)}
            />

            <View style={styles.card}>
              <Text style={styles.label}>Status</Text>
              <View style={styles.statusRow}>
                {VEHICLE_STATUSES.map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => update("status", s as never)}
                    style={[styles.statusChip, form.status === s && styles.statusChipActive]}
                  >
                    <Text
                      style={[
                        styles.statusChipText,
                        form.status === s && styles.statusChipTextActive,
                      ]}
                    >
                      {s}
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
              <Text style={styles.saveBtnText}>{save.isPending ? "Saving…" : "Save changes"}</Text>
            </Pressable>

            <Pressable
              style={styles.deleteBtn}
              onPress={() =>
                Alert.alert("Delete vehicle?", "This cannot be undone.", [
                  { text: "Cancel", style: "cancel" },
                  { text: "Delete", style: "destructive", onPress: () => del.mutate() },
                ])
              }
            >
              <Ionicons name="trash" size={16} color="#FF5577" />
              <Text style={styles.deleteBtnText}>Delete vehicle</Text>
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
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  keyboardType?: "default" | "numeric";
}): React.JSX.Element {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value ?? ""}
        onChangeText={onChange}
        placeholderTextColor={colors.text.secondary}
        keyboardType={keyboardType ?? "default"}
        style={styles.input}
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
  input: {
    color: colors.text.light,
    fontSize: 15,
    paddingVertical: 4,
  },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.dark.bg,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  statusChipActive: {
    backgroundColor: colors.brand.friendlyBlue,
    borderColor: colors.brand.friendlyBlue,
  },
  statusChipText: {
    color: colors.text.secondary,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  statusChipTextActive: { color: "#fff" },
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
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#FF557744",
  },
  deleteBtnText: { color: "#FF5577", fontWeight: "700", fontSize: 13 },
});
