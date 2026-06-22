import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/auth-store";
import { useT } from "../../../lib/locale";

interface UserRow {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  accountType: string;
  staffRole?: string | null;
  status: string;
}

const ACCOUNT_TYPES = ["customer", "staff", "admin"];
const STATUSES = ["active", "inactive", "suspended"];

const ACCOUNT_TYPE_KEY: Record<
  string,
  "admin.accountTypeCustomer" | "admin.accountTypeStaff" | "admin.accountTypeAdmin"
> = {
  customer: "admin.accountTypeCustomer",
  staff: "admin.accountTypeStaff",
  admin: "admin.accountTypeAdmin",
};
const STATUS_KEY: Record<
  string,
  "admin.userStatusActive" | "admin.userStatusInactive" | "admin.userStatusSuspended"
> = {
  active: "admin.userStatusActive",
  inactive: "admin.userStatusInactive",
  suspended: "admin.userStatusSuspended",
};

export default function AdminUserEdit(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const t = useT();
  const me = useAuth((s) => s.user);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [form, setForm] = useState<Partial<UserRow>>({});

  const q = useQuery({
    queryKey: ["admin", "user", id],
    queryFn: async () => {
      const r = await api.getUser(id!);
      return (r as { data: UserRow }).data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (q.data) setForm(q.data);
  }, [q.data]);

  const save = useMutation({
    mutationFn: async () => api.adminUpdateUser(id!, form as Record<string, unknown>),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin"] });
      Alert.alert(t("admin.userSavedTitle"), t("admin.userSavedMessage"));
    },
    onError: (e) =>
      Alert.alert(t("admin.saveFailed"), e instanceof Error ? e.message : t("admin.tryAgain")),
  });

  const disable = useMutation({
    mutationFn: async () => api.adminDisableUser(id!),
    onSuccess: async () => qc.invalidateQueries({ queryKey: ["admin"] }),
  });

  const enable = useMutation({
    mutationFn: async () => api.adminEnableUser(id!),
    onSuccess: async () => qc.invalidateQueries({ queryKey: ["admin"] }),
  });

  const user = q.data;
  const isAdmin = me?.accountType === "admin";

  return (
    <>
      <Stack.Screen
        options={{
          title: user?.name ?? t("admin.userTitleFallback"),
          headerStyle: { backgroundColor: colors.dark.bg },
          headerTintColor: colors.text.light,
        }}
      />
      <View style={styles.root}>
        {q.isLoading || !user ? (
          <ActivityIndicator color={colors.brand.friendlyBlue} style={{ marginTop: 40 }} />
        ) : (
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <ScrollView
              contentContainerStyle={{
                padding: 14,
                paddingTop: insets.top + 14,
                paddingBottom: 200,
                gap: 12,
              }}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.card}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarTxt}>
                    {(user.name ?? user.phone).slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.name}>{user.name ?? t("admin.userUnnamed")}</Text>
                <Text style={styles.meta}>{user.phone}</Text>
                {user.email ? <Text style={styles.meta}>{user.email}</Text> : null}
              </View>

              <Field
                label={t("admin.userFieldName")}
                value={form.name ?? ""}
                onChange={(v) => setForm((s) => ({ ...s, name: v }))}
              />
              <Field
                label={t("admin.userFieldEmail")}
                value={form.email ?? ""}
                onChange={(v) => setForm((s) => ({ ...s, email: v }))}
                keyboardType="email-address"
              />

              {isAdmin && (
                <>
                  <View style={styles.card}>
                    <Text style={styles.label}>{t("admin.userAccountType")}</Text>
                    <View style={styles.chipRow}>
                      {ACCOUNT_TYPES.map((at) => (
                        <Pressable
                          key={at}
                          onPress={() =>
                            setForm((s) => ({
                              ...s,
                              accountType: at,
                              // Staff is unified — assign the canonical role; clear it otherwise.
                              staffRole: at === "staff" ? "sales" : null,
                            }))
                          }
                          style={[styles.chip, form.accountType === at && styles.chipActive]}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              form.accountType === at && styles.chipTextActive,
                            ]}
                          >
                            {ACCOUNT_TYPE_KEY[at] ? t(ACCOUNT_TYPE_KEY[at]) : at}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  <View style={styles.card}>
                    <Text style={styles.label}>{t("admin.userStatus")}</Text>
                    <View style={styles.chipRow}>
                      {STATUSES.map((s) => (
                        <Pressable
                          key={s}
                          onPress={() => setForm((f) => ({ ...f, status: s }))}
                          style={[styles.chip, form.status === s && styles.chipActive]}
                        >
                          <Text
                            style={[styles.chipText, form.status === s && styles.chipTextActive]}
                          >
                            {STATUS_KEY[s] ? t(STATUS_KEY[s]) : s}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                </>
              )}

              <Pressable
                style={[styles.saveBtn, save.isPending && { opacity: 0.5 }]}
                disabled={save.isPending}
                onPress={() => save.mutate()}
              >
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={styles.saveBtnText}>
                  {save.isPending ? t("admin.userSaving") : t("admin.userSave")}
                </Text>
              </Pressable>

              {user.status === "active" ? (
                <Pressable
                  style={styles.dangerBtn}
                  onPress={() =>
                    Alert.alert(t("admin.userDisableTitle"), t("admin.userDisableMessage"), [
                      { text: t("common.cancel"), style: "cancel" },
                      {
                        text: t("admin.userDisable"),
                        style: "destructive",
                        onPress: () => disable.mutate(),
                      },
                    ])
                  }
                >
                  <Ionicons name="ban" size={16} color="#FF5577" />
                  <Text style={styles.dangerBtnText}>{t("admin.userDisableUser")}</Text>
                </Pressable>
              ) : (
                <Pressable style={styles.enableBtn} onPress={() => enable.mutate()}>
                  <Ionicons
                    name="checkmark-done"
                    size={16}
                    color={colors.brand.ecoLimelight ?? "#A9F453"}
                  />
                  <Text style={styles.enableBtnText}>{t("admin.userReenableUser")}</Text>
                </Pressable>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
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
  value: string;
  onChange: (v: string) => void;
  keyboardType?: "default" | "email-address";
}): React.JSX.Element {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType ?? "default"}
        style={styles.input}
        placeholderTextColor={colors.text.secondary}
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
    padding: 14,
    gap: 8,
    alignItems: "flex-start",
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.brand.friendlyBlue + "33",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  avatarTxt: { color: colors.brand.friendlyBlue, fontSize: 22, fontWeight: "800" },
  name: { color: colors.text.light, fontSize: 18, fontWeight: "800", alignSelf: "center" },
  meta: { color: colors.text.secondary, fontSize: 12, alignSelf: "center" },
  label: { color: colors.text.secondary, fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  input: { color: colors.text.light, fontSize: 15, paddingVertical: 4, alignSelf: "stretch" },
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
  dangerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#FF557744",
  },
  dangerBtnText: { color: "#FF5577", fontWeight: "700", fontSize: 13 },
  enableBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: (colors.brand.ecoLimelight ?? "#A9F453") + "55",
  },
  enableBtnText: { color: colors.brand.ecoLimelight ?? "#A9F453", fontWeight: "700", fontSize: 13 },
});
