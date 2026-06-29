import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BackButton } from "../../../components/BackButton";
import { api } from "../../../lib/api";
import { useT } from "../../../lib/locale";

interface Mechanic {
  id: string;
  name?: string;
  phone?: string;
}

interface Repair {
  id: string;
  category?: string;
  description?: string;
  status: string;
  createdAt: string;
  assignedMechanicId?: string | null;
  assignedMechanic?: Mechanic | null;
  estimatedCost?: number | string | null;
  user?: { id: string; name?: string; phone?: string };
}

export default function AdminRepairDetail(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [mechanicPickerOpen, setMechanicPickerOpen] = useState(false);

  const q = useQuery({
    queryKey: ["admin", "repair", id],
    queryFn: async (): Promise<Repair> => {
      const r = await api.getRepairRequest(id!);
      return (r as { data: Repair }).data;
    },
    enabled: !!id,
  });

  const mechanicsQ = useQuery({
    queryKey: ["admin", "mechanics"],
    queryFn: async (): Promise<Mechanic[]> => {
      const r = await api.adminListUsers({ staffRole: "mechanic" });
      return ((r as { data?: Mechanic[] }).data ?? []) as Mechanic[];
    },
    enabled: mechanicPickerOpen,
  });

  const update = useMutation({
    mutationFn: async (patch: Record<string, unknown>) => api.adminUpdateRepair(id!, patch),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e) =>
      Alert.alert(t("admin.updateFailed"), e instanceof Error ? e.message : t("admin.tryAgain")),
  });

  const start = useMutation({
    mutationFn: async () => api.adminStartRepair(id!),
    onSuccess: async () => qc.invalidateQueries({ queryKey: ["admin"] }),
  });

  const complete = useMutation({
    mutationFn: async () => api.adminCompleteRepair(id!),
    onSuccess: async () => qc.invalidateQueries({ queryKey: ["admin"] }),
  });

  const repair = q.data;

  return (
    <>
      <Stack.Screen
        options={{
          title: repair?.category ?? t("admin.repairDetailTitleFallback"),
          headerStyle: { backgroundColor: colors.dark.bg },
          headerTintColor: colors.text.light,
        }}
      />
      <View style={styles.root}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingTop: insets.top + 8,
            paddingHorizontal: 12,
            paddingBottom: 8,
          }}
        >
          <BackButton fallback="/admin/dashboard" />
          <Text
            style={{ color: colors.text.light, fontSize: 18, fontWeight: "800", flex: 1 }}
            numberOfLines={1}
          >
            {repair?.category ?? t("admin.repairDetailTitleFallback")}
          </Text>
        </View>
        {q.isLoading || !repair ? (
          <ActivityIndicator color="#F5B800" style={{ marginTop: 40 }} />
        ) : (
          <ScrollView
            contentContainerStyle={{
              padding: 14,
              paddingTop: 14,
              paddingBottom: 200,
              gap: 12,
            }}
          >
            <View style={styles.card}>
              <Text style={styles.cat}>{repair.category}</Text>
              <Text style={styles.desc}>{repair.description ?? t("admin.dash")}</Text>
              <Text style={styles.meta}>
                {repair.user?.name ?? t("admin.dash")} · {repair.user?.phone ?? ""}
              </Text>
              <Text style={styles.meta}>{new Date(repair.createdAt).toLocaleString()}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.label}>{t("admin.repairMechanic")}</Text>
              <Pressable style={styles.picker} onPress={() => setMechanicPickerOpen(true)}>
                <Ionicons name="person-outline" size={16} color={colors.text.light} />
                <Text style={styles.pickerText}>
                  {repair.assignedMechanic?.name ?? t("admin.repairAssignMechanic")}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.text.secondary} />
              </Pressable>
            </View>

            <View style={styles.actionRow}>
              <Pressable
                style={[styles.actionBtn, { backgroundColor: colors.brand.poolBlue }]}
                disabled={start.isPending || repair.status === "in_progress"}
                onPress={() => start.mutate()}
              >
                <Ionicons name="play" size={14} color="#fff" />
                <Text style={styles.actionText}>{t("admin.repairStart")}</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.actionBtn,
                  { backgroundColor: colors.brand.ecoLimelight ?? "#A9F453" },
                ]}
                disabled={complete.isPending || repair.status === "completed"}
                onPress={() => complete.mutate()}
              >
                <Ionicons name="checkmark" size={14} color="#000" />
                <Text style={[styles.actionText, { color: "#000" }]}>
                  {t("admin.repairComplete")}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        )}

        <Modal
          visible={mechanicPickerOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setMechanicPickerOpen(false)}
        >
          <Pressable style={styles.modalBg} onPress={() => setMechanicPickerOpen(false)}>
            <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.modalTitle}>{t("admin.repairPickMechanic")}</Text>
              {mechanicsQ.isLoading ? (
                <ActivityIndicator color={colors.brand.friendlyBlue} />
              ) : (
                <FlatList
                  data={mechanicsQ.data ?? []}
                  keyExtractor={(m) => m.id}
                  ListEmptyComponent={
                    <Text style={styles.emptyText}>{t("admin.repairNoMechanics")}</Text>
                  }
                  renderItem={({ item }) => (
                    <Pressable
                      style={styles.mechanicRow}
                      onPress={() => {
                        update.mutate({ assignedMechanicId: item.id });
                        setMechanicPickerOpen(false);
                      }}
                    >
                      <Ionicons name="person-circle" size={28} color={colors.brand.friendlyBlue} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.mechName}>
                          {item.name ?? t("admin.repairMechanicFallback")}
                        </Text>
                        <Text style={styles.mechPhone}>{item.phone ?? ""}</Text>
                      </View>
                    </Pressable>
                  )}
                />
              )}
            </Pressable>
          </Pressable>
        </Modal>
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
    gap: 6,
  },
  cat: { color: colors.text.light, fontSize: 16, fontWeight: "700", textTransform: "capitalize" },
  desc: { color: colors.text.light, fontSize: 14 },
  meta: { color: colors.text.secondary, fontSize: 11 },
  label: { color: colors.text.secondary, fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  picker: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
  },
  pickerText: { color: colors.text.light, fontSize: 14, flex: 1 },
  actionRow: { flexDirection: "row", gap: 10 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    paddingVertical: 12,
  },
  actionText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modal: {
    backgroundColor: colors.dark.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    maxHeight: "70%",
  },
  modalTitle: { color: colors.text.light, fontSize: 18, fontWeight: "700", marginBottom: 14 },
  mechanicRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  mechName: { color: colors.text.light, fontSize: 14, fontWeight: "700" },
  mechPhone: { color: colors.text.secondary, fontSize: 11 },
  emptyText: {
    color: colors.text.secondary,
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 20,
  },
});
