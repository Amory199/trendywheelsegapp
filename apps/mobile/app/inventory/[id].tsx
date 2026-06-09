// Sales-mobile quick inventory toggle. Sales agents flip a vehicle between
// available / reserved / sold without opening the admin web. The full
// admin edit screen still lives at /admin/vehicles/[id]; this screen is
// the one-shot status change a sales agent does on the road.

import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
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

import { api } from "../../lib/api";

type SalesStatus = "available" | "reserved" | "sold";

const SALES_STATUSES: SalesStatus[] = ["available", "reserved", "sold"];

const STATUS_LABEL: Record<SalesStatus, string> = {
  available: "Available",
  reserved: "Reserved",
  sold: "Sold",
};

const STATUS_COLOR: Record<SalesStatus, string> = {
  available: colors.brand.ecoLimelight,
  reserved: colors.brand.poolBlue,
  sold: colors.brand.trendyPink,
};

interface Vehicle {
  id: string;
  name: string;
  status: SalesStatus | string;
  salePrice?: number | null;
}

export default function InventoryToggle(): React.JSX.Element {
  const router = useRouter();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [target, setTarget] = useState<SalesStatus | null>(null);
  const [dealNote, setDealNote] = useState("");

  const q = useQuery({
    queryKey: ["inventory", "vehicle", id],
    queryFn: async (): Promise<Vehicle> => {
      const r = await api.getVehicle(id!);
      return (r as { data: Vehicle }).data;
    },
    enabled: !!id,
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!target) throw new Error("Pick a status first");
      return api.setVehicleStatus(id!, {
        toStatus: target,
        dealNote: dealNote.trim() || null,
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["inventory"] });
      await qc.invalidateQueries({ queryKey: ["vehicles"] });
      Alert.alert(
        "Updated",
        `${q.data?.name ?? "Vehicle"} → ${target ? STATUS_LABEL[target] : ""}`,
      );
      router.back();
    },
    onError: (e) => Alert.alert("Could not update", e instanceof Error ? e.message : "Try again"),
  });

  const current = (q.data?.status as SalesStatus | undefined) ?? "available";

  return (
    <>
      <Stack.Screen
        options={{
          title: q.data?.name ?? "Inventory",
          headerStyle: { backgroundColor: colors.dark.bg },
          headerTitleStyle: { color: "#fff" },
          headerTintColor: "#fff",
        }}
      />
      {q.isLoading ? (
        <View style={[styles.container, { justifyContent: "center" }]}>
          <ActivityIndicator color={colors.brand.trendyPink} />
        </View>
      ) : (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <Text style={styles.label}>Current status</Text>
            <View style={[styles.chip, { backgroundColor: STATUS_COLOR[current] ?? "#888" }]}>
              <Text style={styles.chipText}>{STATUS_LABEL[current] ?? current}</Text>
            </View>
          </View>

          <Text style={styles.section}>Change to</Text>
          {SALES_STATUSES.map((s) => {
            const selected = target === s;
            const disabled = current === s;
            return (
              <Pressable
                key={s}
                onPress={() => !disabled && setTarget(s)}
                disabled={disabled}
                style={[
                  styles.row,
                  selected && { borderColor: STATUS_COLOR[s], borderWidth: 2 },
                  disabled && { opacity: 0.35 },
                ]}
              >
                <View style={[styles.rowDot, { backgroundColor: STATUS_COLOR[s] }]} />
                <Text style={styles.rowText}>{STATUS_LABEL[s]}</Text>
                {disabled ? <Text style={styles.rowHint}>Current</Text> : null}
                {selected ? <Ionicons name="checkmark" size={18} color={STATUS_COLOR[s]} /> : null}
              </Pressable>
            );
          })}

          {target === "sold" || target === "reserved" ? (
            <>
              <Text style={styles.section}>Deal note (optional)</Text>
              <TextInput
                style={styles.input}
                value={dealNote}
                onChangeText={setDealNote}
                placeholder="e.g. cash, plate #1234, customer Ahmed"
                placeholderTextColor="#888"
                multiline
              />
            </>
          ) : null}

          <Pressable
            style={[styles.cta, (!target || save.isPending) && { opacity: 0.5 }]}
            onPress={() => save.mutate()}
            disabled={!target || save.isPending}
          >
            <Text style={styles.ctaText}>{save.isPending ? "Saving…" : "Update status"}</Text>
          </Pressable>
        </ScrollView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  content: { padding: 16, gap: 12 },
  card: {
    backgroundColor: colors.dark.card,
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: { color: "#bbb", fontSize: 12, fontWeight: "600", textTransform: "uppercase" },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  chipText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  section: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
    marginTop: 8,
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.dark.card,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "transparent",
  },
  rowDot: { width: 10, height: 10, borderRadius: 5 },
  rowText: { color: "#fff", fontSize: 15, flex: 1 },
  rowHint: { color: "#888", fontSize: 12 },
  input: {
    backgroundColor: colors.dark.card,
    color: "#fff",
    padding: 12,
    borderRadius: 10,
    minHeight: 60,
    textAlignVertical: "top",
  },
  cta: {
    backgroundColor: colors.brand.trendyPink,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  ctaText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
