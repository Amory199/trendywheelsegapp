import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
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

const TYPES = [
  { key: "oil", labelKey: "service.maintenance.typeOil" },
  { key: "battery", labelKey: "service.maintenance.typeBattery" },
  { key: "tire", labelKey: "service.maintenance.typeTire" },
  { key: "inspection", labelKey: "service.maintenance.typeInspection" },
  { key: "full", labelKey: "service.maintenance.typeFull" },
] as const;

type ServiceType = (typeof TYPES)[number]["key"];

export default function MaintenanceScreen(): JSX.Element {
  const router = useRouter();
  const qc = useQueryClient();
  const t = useT();
  const track = useTracking();
  const [serviceType, setServiceType] = useState<ServiceType>("oil");
  const [preferredDate, setPreferredDate] = useState<Date>(new Date(Date.now() + 86400000));
  const [showPicker, setShowPicker] = useState(false);
  const [notes, setNotes] = useState("");

  const submit = useMutation({
    mutationFn: () =>
      api.request("POST", "/api/service/maintenance", {
        body: {
          serviceType,
          preferredDate: preferredDate.toISOString(),
          notes: notes || undefined,
        },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["service", "maintenance"] });
      Alert.alert(t("service.maintenance.successTitle"), t("service.maintenance.successBody"), [
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
          title: t("service.maintenance.headerTitle"),
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
            <Ionicons name="build" size={32} color={colors.brand.poolBlue} />
            <Text style={styles.title}>{t("service.maintenance.intro")}</Text>
            <Text style={styles.subtitle}>{t("service.maintenance.subtitle")}</Text>
          </View>

          <Text style={[styles.label, { letterSpacing: track(1) }]}>
            {t("service.maintenance.serviceLabel")}
          </Text>
          <View style={styles.chipRow}>
            {TYPES.map((item) => {
              const active = serviceType === item.key;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => setServiceType(item.key)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {t(item.labelKey)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.label, { letterSpacing: track(1) }]}>
            {t("service.maintenance.preferredDate")}
          </Text>
          <Pressable onPress={() => setShowPicker(true)} style={styles.input}>
            <Text style={styles.inputText}>{preferredDate.toLocaleDateString()}</Text>
          </Pressable>
          {showPicker && (
            <DateTimePicker
              value={preferredDate}
              mode="date"
              minimumDate={new Date()}
              onChange={(_, d) => {
                setShowPicker(false);
                if (d) setPreferredDate(d);
              }}
            />
          )}

          <Text style={[styles.label, { letterSpacing: track(1) }]}>
            {t("service.maintenance.notesLabel")}
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder={t("service.maintenance.notesPlaceholder")}
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
                <Text style={styles.submitBtnText}>{t("service.maintenance.submit")}</Text>
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
  inputText: { color: colors.text.light, fontSize: 14 },
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
