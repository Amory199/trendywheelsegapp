import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import { Stack, useLocalSearchParams } from "expo-router";
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

import { api } from "../../../lib/api";

interface Listing {
  id: string;
  title: string;
  price?: number;
  status?: string;
  description?: string;
}

const STATUSES = ["active", "sold", "paused"];

export default function AdminSaleEdit(): React.JSX.Element {
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [form, setForm] = useState<Partial<Listing>>({});

  const q = useQuery({
    queryKey: ["admin", "sale", id],
    queryFn: async (): Promise<Listing> => {
      const r = await api.getSalesListing(id!);
      return (r as { data: Listing }).data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (q.data) setForm(q.data);
  }, [q.data]);

  const save = useMutation({
    mutationFn: async () => api.adminUpdateSale(id!, form),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin"] });
      Alert.alert("Saved", "Listing updated.");
    },
    onError: (e) => Alert.alert("Save failed", e instanceof Error ? e.message : "Try again"),
  });

  return (
    <>
      <Stack.Screen
        options={{
          title: form.title ?? "Listing",
          headerStyle: { backgroundColor: colors.dark.bg },
          headerTintColor: colors.text.light,
        }}
      />
      <View style={styles.root}>
        {q.isLoading ? (
          <ActivityIndicator color={colors.brand.trendyPink} style={{ marginTop: 40 }} />
        ) : (
          <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 200, gap: 12 }}>
            <View style={styles.card}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                value={form.title ?? ""}
                onChangeText={(v) => setForm((s) => ({ ...s, title: v }))}
                style={styles.input}
              />
            </View>
            <View style={styles.card}>
              <Text style={styles.label}>Price (EGP)</Text>
              <TextInput
                value={form.price?.toString() ?? ""}
                onChangeText={(v) => setForm((s) => ({ ...s, price: Number(v) as never }))}
                keyboardType="numeric"
                style={styles.input}
              />
            </View>
            <View style={styles.card}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                value={form.description ?? ""}
                onChangeText={(v) => setForm((s) => ({ ...s, description: v }))}
                multiline
                style={[styles.input, { minHeight: 80, textAlignVertical: "top" }]}
              />
            </View>
            <View style={styles.card}>
              <Text style={styles.label}>Status</Text>
              <View style={styles.chipRow}>
                {STATUSES.map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => setForm((f) => ({ ...f, status: s }))}
                    style={[styles.chip, form.status === s && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, form.status === s && styles.chipTextActive]}>
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
              <Text style={styles.saveBtnText}>{save.isPending ? "Saving…" : "Save"}</Text>
            </Pressable>
          </ScrollView>
        )}
      </View>
    </>
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
