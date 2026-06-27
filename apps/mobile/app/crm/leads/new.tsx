import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/auth-store";
import { useT } from "../../../lib/locale";
import { playSound } from "../../../lib/sounds";

interface Agent {
  id: string;
  name?: string;
  staffRole?: string | null;
}

const SOURCES: { value: string; labelKey: string }[] = [
  { value: "walk-in", labelKey: "crm.newLead.sourceWalkIn" },
  { value: "phone", labelKey: "crm.newLead.sourcePhone" },
  { value: "whatsapp", labelKey: "crm.newLead.sourceWhatsApp" },
  { value: "instagram", labelKey: "crm.newLead.sourceInstagram" },
  { value: "facebook", labelKey: "crm.newLead.sourceFacebook" },
  { value: "referral", labelKey: "crm.newLead.sourceReferral" },
  { value: "other", labelKey: "crm.newLead.sourceOther" },
];

export default function NewLead(): React.JSX.Element {
  const router = useRouter();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const t = useT();
  const isAdmin = useAuth((s) => s.user?.accountType === "admin");
  const [form, setForm] = useState({
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    source: "phone",
    estimatedValue: "",
    notes: "",
    ownerId: "", // "" = auto (round-robin); admin can pick an agent
  });

  // Admins may hand the lead straight to an agent; fetch the team for the picker.
  const teamQ = useQuery({
    queryKey: ["admin", "sales-team"],
    queryFn: async (): Promise<Agent[]> => {
      const r = await api.crmTeam();
      return (r.data ?? []) as Agent[];
    },
    enabled: isAdmin,
  });
  const agents = (teamQ.data ?? []).filter(
    (a) => a.staffRole === "sales" || a.staffRole === "support" || !a.staffRole,
  );

  const create = useMutation({
    mutationFn: async () =>
      api.crmCreateLead({
        contactName: form.contactName.trim(),
        contactPhone: form.contactPhone.trim() || undefined,
        contactEmail: form.contactEmail.trim() || undefined,
        source: form.source,
        estimatedValue: form.estimatedValue ? Number(form.estimatedValue) : 0,
        notes: form.notes.trim() || undefined,
        ownerId: isAdmin && form.ownerId ? form.ownerId : undefined,
      }),
    onSuccess: async (res) => {
      playSound("success");
      await qc.invalidateQueries({ queryKey: ["crm"] });
      const id = (res.data as { id?: string })?.id;
      if (id) router.replace(`/crm/leads/${id}`);
      else router.back();
    },
    onError: (e) => {
      playSound("error");
      Alert.alert(
        t("crm.newLead.createFailedTitle"),
        e instanceof Error ? e.message : t("crm.newLead.tryAgain"),
      );
    },
  });

  const canSubmit = form.contactName.trim().length > 0;

  return (
    <View style={styles.root}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.text.light} />
        </Pressable>
        <Text style={styles.topBarTitle}>{t("crm.newLead.title")}</Text>
        <View style={{ width: 24 }} />
      </View>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 14,
            paddingTop: 24,
            paddingBottom: 200,
            gap: 12,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <Field
            label={t("crm.newLead.contactNameRequired")}
            value={form.contactName}
            onChange={(v) => setForm((s) => ({ ...s, contactName: v }))}
          />
          <Field
            label={t("crm.newLead.phone")}
            value={form.contactPhone}
            onChange={(v) => setForm((s) => ({ ...s, contactPhone: v }))}
            keyboardType="phone-pad"
          />
          <Field
            label={t("crm.newLead.email")}
            value={form.contactEmail}
            onChange={(v) => setForm((s) => ({ ...s, contactEmail: v }))}
            keyboardType="email-address"
          />
          <View style={styles.card}>
            <Text style={styles.label}>{t("crm.newLead.source")}</Text>
            <View style={styles.chipRow}>
              {SOURCES.map((s) => (
                <Pressable
                  key={s.value}
                  onPress={() => setForm((f) => ({ ...f, source: s.value }))}
                  style={[styles.chip, form.source === s.value && styles.chipActive]}
                >
                  <Text style={[styles.chipText, form.source === s.value && styles.chipTextActive]}>
                    {t(s.labelKey)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          {isAdmin ? (
            <View style={styles.card}>
              <Text style={styles.label}>{t("crm.newLead.assignTo")}</Text>
              <View style={styles.chipRow}>
                <Pressable
                  onPress={() => setForm((f) => ({ ...f, ownerId: "" }))}
                  style={[styles.chip, form.ownerId === "" && styles.chipActive]}
                >
                  <Text style={[styles.chipText, form.ownerId === "" && styles.chipTextActive]}>
                    {t("crm.newLead.assignAuto")}
                  </Text>
                </Pressable>
                {agents.map((a) => (
                  <Pressable
                    key={a.id}
                    onPress={() => setForm((f) => ({ ...f, ownerId: a.id }))}
                    style={[styles.chip, form.ownerId === a.id && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, form.ownerId === a.id && styles.chipTextActive]}>
                      {a.name ?? t("crm.newLead.agentFallback")}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          <Field
            label={t("crm.newLead.estimatedValue")}
            value={form.estimatedValue}
            onChange={(v) => setForm((s) => ({ ...s, estimatedValue: v }))}
            keyboardType="numeric"
          />
          <Field
            label={t("crm.newLead.notes")}
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
            <Text style={styles.saveBtnText}>
              {create.isPending ? t("crm.newLead.creating") : t("crm.newLead.create")}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
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
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: colors.dark.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  topBarTitle: { color: colors.text.light, fontSize: 17, fontWeight: "700" },
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
