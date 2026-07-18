import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import { adminMetricsResponseSchema } from "@trendywheels/validators";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { RoleSwitcher } from "../../components/RoleSwitcher";
import { TWAurora } from "../../components/ui";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-store";
import { useT } from "../../lib/locale";

interface AdminMetrics {
  totalUsers: number;
  totalVehicles: number;
  totalBookings: number;
  pendingBookings?: number;
  openTickets: number;
  monthlyRevenue: number;
}

export default function AdminDashboard(): JSX.Element {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const t = useT();

  const metricsQ = useQuery({
    queryKey: ["admin", "metrics"],
    queryFn: async (): Promise<AdminMetrics> => {
      const res = await api.request<{ data: AdminMetrics }>("GET", "/api/admin/metrics", {
        parse: adminMetricsResponseSchema,
      });
      return res.data;
    },
  });

  const m = metricsQ.data;

  // Push-independent signal for manual-OTP requests: poll the pending count so
  // admins see waiting requests even when a device can't receive push (e.g. iOS
  // before an APNs key is configured). Critical for the "issue a code" flow.
  const otpQ = useQuery({
    queryKey: ["admin", "otp-requests", "count"],
    queryFn: async (): Promise<number> => {
      const r = await api.request<{ data: unknown[] }>("GET", "/api/auth/otp-requests");
      return (r.data ?? []).length;
    },
    refetchInterval: 20000,
    enabled: user?.accountType === "admin",
  });
  const pendingOtp = otpQ.data ?? 0;

  return (
    <View style={styles.root}>
      <TWAurora variant="ambient" />
      <View style={styles.header}>
        <View>
          <Text style={styles.hello}>
            {t("admin.dashHiPrefix")}
            {user?.name ?? t("admin.dashAdminFallback")}
          </Text>
          <Text style={styles.role}>{t("admin.dashRole")}</Text>
        </View>
        <Pressable
          hitSlop={12}
          style={styles.logoutBtn}
          onPress={async () => {
            await logout();
            router.replace("/(auth)/phone");
          }}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.text.light} />
          <Text style={styles.logoutText}>{t("auth.logout")}</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={metricsQ.isFetching}
            onRefresh={() => metricsQ.refetch()}
            tintColor={colors.text.light}
          />
        }
      >
        <View style={styles.switcherRow}>
          <RoleSwitcher />
        </View>
        <View style={styles.grid}>
          <Kpi
            label={t("admin.kpiPendingBookings")}
            value={m?.pendingBookings ?? 0}
            tone="pink"
            onPress={() => router.push("/admin/bookings")}
          />
          <Kpi
            label={t("admin.kpiTotalUsers")}
            value={m?.totalUsers ?? 0}
            tone="blue"
            onPress={() => router.push("/admin/users")}
          />
          <Kpi
            label={t("admin.kpiVehicles")}
            value={m?.totalVehicles ?? 0}
            tone="pool"
            onPress={() => router.push("/admin/vehicles")}
          />
          <Kpi
            label={t("admin.kpiBookingsTotal")}
            value={m?.totalBookings ?? 0}
            tone="amber"
            onPress={() => router.push("/admin/bookings")}
          />
          <Kpi
            label={t("admin.kpiOpenTickets")}
            value={m?.openTickets ?? 0}
            tone="pink"
            onPress={() => router.push("/admin/tickets")}
          />
          <Kpi
            label={t("admin.kpiRevenue")}
            value={m?.monthlyRevenue ? Math.round(Number(m.monthlyRevenue)) : 0}
            tone="blue"
            onPress={() => router.push("/admin/sales")}
          />
          <Kpi
            label={t("admin.kpiInactiveLeads")}
            value={0}
            tone="pool"
            onPress={() => router.push("/admin/leads/inactive")}
          />
        </View>

        <Pressable
          onPress={() => router.push("/booking-check-in")}
          style={({ pressed }) => [styles.linkRow, pressed && { opacity: 0.85 }]}
        >
          <Ionicons name="qr-code-outline" size={18} color={colors.brand.poolBlue} />
          <Text style={styles.linkLabel}>{t("checkin.title")}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.text.secondary} />
        </Pressable>

        <Pressable
          onPress={() => router.push("/admin/otp-requests")}
          style={({ pressed }) => [
            styles.linkRow,
            pendingOtp > 0 && styles.linkRowAlert,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Ionicons name="shield-checkmark-outline" size={18} color={colors.brand.trendyPink} />
          <Text style={styles.linkLabel}>{t("admin.otpInboxTitle")}</Text>
          {pendingOtp > 0 ? (
            <View style={styles.otpBadge}>
              <Text style={styles.otpBadgeText}>{pendingOtp}</Text>
            </View>
          ) : null}
          <Ionicons name="chevron-forward" size={18} color={colors.text.secondary} />
        </Pressable>

        {metricsQ.isLoading && (
          <ActivityIndicator color={colors.brand.friendlyBlue} style={{ marginTop: 24 }} />
        )}
      </ScrollView>
    </View>
  );
}

function Kpi({
  label,
  value,
  tone,
  onPress,
}: {
  label: string;
  value: number;
  tone: "blue" | "pink" | "amber" | "pool";
  onPress?: () => void;
}): JSX.Element {
  const colorMap = {
    blue: colors.brand.friendlyBlue,
    pink: colors.brand.trendyPink,
    pool: colors.brand.poolBlue,
    amber: "#F5B800",
  } as const;
  const tint = colorMap[tone];
  return (
    <Pressable onPress={onPress} style={[styles.card, { borderLeftColor: tint }]}>
      <Text style={styles.value}>{Number(value).toLocaleString()}</Text>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.dark.bg },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 72,
    paddingHorizontal: 18,
    paddingBottom: 14,
  },
  hello: { color: colors.text.light, fontSize: 20, fontWeight: "700" },
  role: { color: colors.brand.friendlyBlue, fontSize: 11, fontWeight: "800", letterSpacing: 1.5 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  logoutText: { color: colors.text.light, fontSize: 13, fontWeight: "700" },
  scroll: { padding: 14, paddingBottom: 120, gap: 12 },
  switcherRow: { marginBottom: 2 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  card: {
    flexBasis: "47%",
    flexGrow: 1,
    minWidth: 140,
    backgroundColor: colors.dark.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.dark.border,
    borderLeftWidth: 4,
    padding: 14,
    gap: 4,
  },
  value: { color: colors.text.light, fontSize: 24, fontWeight: "800" },
  label: { color: colors.text.secondary, fontSize: 12, fontWeight: "600" },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 16,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.dark.border,
    backgroundColor: colors.dark.card,
  },
  linkLabel: { flex: 1, color: colors.text.light, fontSize: 15, fontWeight: "700" },
  linkRowAlert: { borderColor: colors.brand.trendyPink },
  otpBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 7,
    backgroundColor: colors.brand.trendyPink,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  otpBadgeText: { color: "#fff", fontSize: 13, fontWeight: "800" },
});
