import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import { Stack, useLocalSearchParams } from "expo-router";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "../../../../lib/api";
import { useT } from "../../../../lib/locale";

type Kind = "maintenance" | "customization" | "transport";

const KIND_TITLE_KEY: Record<
  string,
  "admin.serviceKindMaintenance" | "admin.serviceKindCustomization" | "admin.serviceKindTransport"
> = {
  maintenance: "admin.serviceKindMaintenance",
  customization: "admin.serviceKindCustomization",
  transport: "admin.serviceKindTransport",
};

const SERVICE_STATUS_KEY: Record<
  string,
  | "admin.serviceStatusSubmitted"
  | "admin.serviceStatusAssigned"
  | "admin.serviceStatusInProgress"
  | "admin.serviceStatusCompleted"
  | "admin.serviceStatusCancelled"
> = {
  submitted: "admin.serviceStatusSubmitted",
  assigned: "admin.serviceStatusAssigned",
  "in-progress": "admin.serviceStatusInProgress",
  completed: "admin.serviceStatusCompleted",
  cancelled: "admin.serviceStatusCancelled",
};

interface ServiceItem {
  id: string;
  status: string;
  notes?: string | null;
  cargoNotes?: string | null;
  budget?: number | string | null;
  priceEgp?: number | string | null;
  estimatedCost?: number | string | null;
  serviceType?: string;
  kind?: string;
  fromAddress?: string;
  toAddress?: string;
  user?: { id: string; name?: string; phone?: string };
}

const STATUSES = ["submitted", "assigned", "in-progress", "completed", "cancelled"];

export default function AdminServiceRequestDetail(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const t = useT();
  const { kind, id } = useLocalSearchParams<{ kind: Kind; id: string }>();
  const [notes, setNotes] = useState<string>("");
  const [cost, setCost] = useState<string>("");

  const q = useQuery({
    queryKey: ["admin", "service", kind, id],
    queryFn: async (): Promise<ServiceItem> => {
      const path = `/api/service/${kind}/${id}`;
      const r = await api.request<{ data: ServiceItem }>("GET", path);
      return r.data;
    },
    enabled: !!kind && !!id,
  });

  const update = useMutation({
    mutationFn: async (patch: Record<string, unknown>) =>
      api.adminUpdateServiceRequest(kind as Kind, id!, patch),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin", "service"] });
    },
    onError: (e) =>
      Alert.alert(t("admin.updateFailed"), e instanceof Error ? e.message : t("admin.tryAgain")),
  });

  const item = q.data;

  return (
    <>
      <Stack.Screen
        options={{
          title:
            kind && KIND_TITLE_KEY[kind]
              ? t(KIND_TITLE_KEY[kind])
              : t("admin.serviceDetailTitleFallback"),
          headerStyle: { backgroundColor: colors.dark.bg },
          headerTintColor: colors.text.light,
        }}
      />
      <View style={styles.root}>
        {q.isLoading || !item ? (
          <ActivityIndicator color={colors.brand.poolBlue} style={{ marginTop: 40 }} />
        ) : (
          <ScrollView
            contentContainerStyle={{
              padding: 14,
              paddingTop: insets.top + 14,
              paddingBottom: 200,
              gap: 12,
            }}
          >
            <View style={styles.card}>
              <Text style={styles.tt}>
                {item.serviceType ??
                  item.kind ??
                  (item.fromAddress
                    ? t("admin.serviceTransportFallback")
                    : t("admin.serviceRequestFallback"))}
              </Text>
              {item.fromAddress ? (
                <Text style={styles.meta}>
                  {item.fromAddress} → {item.toAddress}
                </Text>
              ) : null}
              <Text style={styles.meta}>
                {item.user?.name ?? t("admin.dash")} · {item.user?.phone ?? ""}
              </Text>
              {item.notes ? (
                <Text style={styles.body}>
                  {t("admin.serviceNotesPrefix")}
                  {item.notes}
                </Text>
              ) : null}
              {item.cargoNotes ? (
                <Text style={styles.body}>
                  {t("admin.serviceCargoPrefix")}
                  {item.cargoNotes}
                </Text>
              ) : null}
            </View>

            <View style={styles.card}>
              <Text style={styles.label}>{t("admin.serviceFieldStatus")}</Text>
              <View style={styles.chipRow}>
                {STATUSES.map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => update.mutate({ status: s })}
                    style={[styles.chip, item.status === s && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, item.status === s && styles.chipTextActive]}>
                      {SERVICE_STATUS_KEY[s] ? t(SERVICE_STATUS_KEY[s]) : s}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.label}>{t("admin.serviceAddNote")}</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                multiline
                placeholder={t("admin.serviceNotePlaceholder")}
                placeholderTextColor={colors.text.secondary}
                style={styles.input}
              />
              <Pressable
                style={[styles.saveBtn, !notes.trim() && { opacity: 0.5 }]}
                disabled={!notes.trim() || update.isPending}
                onPress={() => {
                  const field = kind === "transport" ? "cargoNotes" : "notes";
                  update.mutate({ [field]: notes.trim() });
                  setNotes("");
                }}
              >
                <Text style={styles.saveBtnText}>{t("admin.serviceSaveNote")}</Text>
              </Pressable>
            </View>

            <View style={styles.card}>
              <Text style={styles.label}>
                {kind === "transport"
                  ? t("admin.servicePriceTransport")
                  : kind === "customization"
                    ? t("admin.servicePriceCustomization")
                    : t("admin.servicePriceMaintenance")}
              </Text>
              <TextInput
                value={cost}
                onChangeText={setCost}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={colors.text.secondary}
                style={styles.input}
              />
              <Pressable
                style={[styles.saveBtn, !cost.trim() && { opacity: 0.5 }]}
                disabled={!cost.trim() || update.isPending}
                onPress={() => {
                  const field =
                    kind === "transport"
                      ? "priceEgp"
                      : kind === "customization"
                        ? "budget"
                        : "estimatedCost";
                  update.mutate({ [field]: Number(cost) });
                  setCost("");
                }}
              >
                <Text style={styles.saveBtnText}>{t("admin.serviceSavePrice")}</Text>
              </Pressable>
            </View>
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
  tt: { color: colors.text.light, fontSize: 16, fontWeight: "700", textTransform: "capitalize" },
  meta: { color: colors.text.secondary, fontSize: 12 },
  body: { color: colors.text.light, fontSize: 13, marginTop: 4 },
  label: { color: colors.text.secondary, fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  input: {
    color: colors.text.light,
    fontSize: 14,
    paddingVertical: 6,
    minHeight: 40,
    textAlignVertical: "top",
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.dark.bg,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  chipActive: { backgroundColor: colors.brand.poolBlue, borderColor: colors.brand.poolBlue },
  chipText: {
    color: colors.text.secondary,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  chipTextActive: { color: "#fff" },
  saveBtn: {
    backgroundColor: colors.brand.trendyPink,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontWeight: "800", fontSize: 13 },
});
