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

  return (
    <View style={styles.root}>
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
          onPress={async () => {
            await logout();
            router.replace("/(auth)/phone");
          }}
        >
          <Ionicons name="log-out-outline" size={22} color={colors.text.light} />
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
        <View style={styles.grid}>
          <Kpi
            label={t("admin.kpiPendingBookings")}
            value={m?.pendingBookings ?? 0}
            tone="pink"
            onPress={() => router.push("/admin/bookings")}
          />
          <Kpi label={t("admin.kpiTotalUsers")} value={m?.totalUsers ?? 0} tone="blue" />
          <Kpi label={t("admin.kpiVehicles")} value={m?.totalVehicles ?? 0} tone="pool" />
          <Kpi label={t("admin.kpiBookingsTotal")} value={m?.totalBookings ?? 0} tone="amber" />
          <Kpi label={t("admin.kpiOpenTickets")} value={m?.openTickets ?? 0} tone="pink" />
          <Kpi
            label={t("admin.kpiRevenue")}
            value={m?.monthlyRevenue ? Math.round(Number(m.monthlyRevenue)) : 0}
            tone="blue"
          />
          <Kpi
            label={t("admin.kpiInactiveLeads")}
            value={0}
            tone="pool"
            onPress={() => router.push("/admin/leads/inactive")}
          />
        </View>

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
  scroll: { padding: 14, paddingBottom: 120, gap: 12 },
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
});
