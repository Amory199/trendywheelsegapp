import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { BackButton } from "../../../components/BackButton";
import { ErrorState } from "../../../components/ErrorState";
import { api } from "../../../lib/api";
import { useT } from "../../../lib/locale";
import { useTheme } from "../../../lib/use-theme";

interface OtpRequestRow {
  id: string;
  phone: string;
  requestedAt: string;
}

// Admin inbox for manual-OTP requests. A customer who can't receive an SMS taps
// "request a code"; every admin is pushed here. Issuing generates a real code
// (delivered to the waiting device via its poll) and shows it here too so the
// admin can also relay it by phone/WhatsApp as a backstop.
export default function AdminOtpRequests(): JSX.Element {
  const qc = useQueryClient();
  const t = useT();
  const { palette } = useTheme();

  const listQ = useQuery({
    queryKey: ["admin", "otp-requests"],
    queryFn: async (): Promise<OtpRequestRow[]> => {
      const r = await api.request<{ data: OtpRequestRow[] }>("GET", "/api/auth/otp-requests");
      return r.data ?? [];
    },
    // Keep the inbox fresh while an admin is looking at it.
    refetchInterval: 15000,
  });

  const issue = useMutation({
    mutationFn: async (id: string) =>
      api.request<{ data: { ok: boolean } }>("POST", `/api/auth/otp-request/${id}/issue`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "otp-requests"] });
      Alert.alert(t("admin.otpIssuedTitle"), t("admin.otpIssuedBody"));
    },
    onError: (err) =>
      Alert.alert(
        t("admin.otpIssueFailed"),
        err instanceof Error ? err.message : t("admin.tryAgain"),
      ),
  });

  const confirmIssue = (row: OtpRequestRow): void => {
    Alert.alert(t("admin.otpConfirmTitle"), `${row.phone}`, [
      { text: t("admin.cancel"), style: "cancel" },
      { text: t("admin.otpIssue"), onPress: () => issue.mutate(row.id) },
    ]);
  };

  if (listQ.isError) {
    return <ErrorState onRetry={() => void listQ.refetch()} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <View style={styles.header}>
        <BackButton color={palette.text} />
        <Text style={[styles.title, { color: palette.text }]}>{t("admin.otpInboxTitle")}</Text>
        <View style={{ width: 32 }} />
      </View>

      {listQ.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand.friendlyBlue} size="large" />
        </View>
      ) : (
        <FlatList<OtpRequestRow>
          data={listQ.data ?? []}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 60 }}
          refreshControl={
            <RefreshControl
              refreshing={listQ.isRefetching}
              onRefresh={() => void listQ.refetch()}
              tintColor={palette.text}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbox-ellipses-outline" size={56} color={palette.muted} />
              <Text style={[styles.emptyText, { color: palette.muted }]}>
                {t("admin.otpInboxEmpty")}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View
              style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.phone, { color: palette.text }]}>{item.phone}</Text>
                <Text style={[styles.meta, { color: palette.muted }]}>
                  {new Date(item.requestedAt).toLocaleString()}
                </Text>
              </View>
              <Pressable
                onPress={() => confirmIssue(item)}
                disabled={issue.isPending}
                style={({ pressed }) => [styles.issueBtn, pressed && { opacity: 0.85 }]}
              >
                <Ionicons name="key-outline" size={16} color="#fff" />
                <Text style={styles.issueText}>{t("admin.otpIssue")}</Text>
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: { fontSize: 18, fontWeight: "800" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", gap: 12, paddingTop: 80 },
  emptyText: { fontSize: 15, fontWeight: "600" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  phone: { fontSize: 16, fontWeight: "700" },
  meta: { fontSize: 12, marginTop: 3 },
  issueBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.brand.trendyPink,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  issueText: { color: "#fff", fontWeight: "800", fontSize: 13 },
});
