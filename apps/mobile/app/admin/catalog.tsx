import { Ionicons } from "@expo/vector-icons";
import { colors } from "@trendywheels/ui-tokens";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { BackButton } from "../../components/BackButton";
import { useT } from "../../lib/locale";
import { useDisplay, useTracking } from "../../lib/typography";

type ToolKey =
  | "SalesTeam"
  | "Vehicles"
  | "Repairs"
  | "ServiceRequests"
  | "SalesListings"
  | "Orders"
  | "SystemConfig"
  | "RecentActivity";

interface Tool {
  icon: keyof typeof Ionicons.glyphMap;
  labelKey: `admin.tool${ToolKey}Label`;
  subKey: `admin.tool${ToolKey}Sub`;
  route: string;
  tint?: string;
}

const TOOLS: Tool[] = [
  {
    icon: "people-outline",
    labelKey: "admin.toolSalesTeamLabel",
    subKey: "admin.toolSalesTeamSub",
    route: "/admin/sales-team",
    tint: colors.brand.trendyPink,
  },
  {
    icon: "cube-outline",
    labelKey: "admin.toolVehiclesLabel",
    subKey: "admin.toolVehiclesSub",
    route: "/admin/vehicles",
    tint: colors.brand.friendlyBlue,
  },
  {
    icon: "construct-outline",
    labelKey: "admin.toolRepairsLabel",
    subKey: "admin.toolRepairsSub",
    route: "/admin/repairs",
    tint: "#F5B800",
  },
  {
    icon: "build-outline",
    labelKey: "admin.toolServiceRequestsLabel",
    subKey: "admin.toolServiceRequestsSub",
    route: "/admin/service-requests",
    tint: colors.brand.poolBlue,
  },
  {
    icon: "pricetags-outline",
    labelKey: "admin.toolSalesListingsLabel",
    subKey: "admin.toolSalesListingsSub",
    route: "/admin/sales",
    tint: colors.brand.trendyPink,
  },
  {
    icon: "bag-handle-outline",
    labelKey: "admin.toolOrdersLabel",
    subKey: "admin.toolOrdersSub",
    route: "/admin/orders",
    tint: colors.brand.ecoLimelight,
  },
  {
    icon: "settings-outline",
    labelKey: "admin.toolSystemConfigLabel",
    subKey: "admin.toolSystemConfigSub",
    route: "/admin/system-config",
    tint: colors.brand.friendlyBlue,
  },
  {
    icon: "document-text-outline",
    labelKey: "admin.toolRecentActivityLabel",
    subKey: "admin.toolRecentActivitySub",
    route: "/admin/recent-activity",
    tint: colors.brand.poolBlue,
  },
];

export default function AdminCatalog(): React.JSX.Element {
  const router = useRouter();
  const t = useT();
  const display = useDisplay();
  const track = useTracking();
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <BackButton style={{ marginLeft: -8, marginBottom: 6 }} fallback="/admin/dashboard" />
        <Text style={[styles.kicker, { letterSpacing: track(1.5) }]}>
          {t("admin.catalogKicker")}
        </Text>
        <Text style={[styles.title, display(0.3)]}>{t("admin.catalogTitle")}</Text>
        <Text style={styles.subtitle}>{t("admin.catalogSubtitle")}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {TOOLS.map((tool) => (
          <TouchableOpacity
            key={tool.route}
            style={styles.row}
            onPress={() => router.push(tool.route as never)}
            activeOpacity={0.85}
          >
            <View
              style={[
                styles.icon,
                { backgroundColor: (tool.tint ?? colors.brand.friendlyBlue) + "22" },
              ]}
            >
              <Ionicons name={tool.icon} size={22} color={tool.tint ?? colors.brand.friendlyBlue} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{t(tool.labelKey)}</Text>
              <Text style={styles.sub}>{t(tool.subKey)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.text.secondary} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.dark.bg },
  header: { paddingTop: 72, paddingHorizontal: 18, paddingBottom: 14 },
  kicker: { color: colors.brand.friendlyBlue, fontSize: 11, fontWeight: "800" },
  title: {
    color: colors.text.light,
    fontSize: 28,
    textTransform: "uppercase",
    marginTop: 4,
  },
  subtitle: { color: colors.text.secondary, fontSize: 12, marginTop: 6, lineHeight: 16 },
  scroll: { padding: 14, paddingBottom: 120, gap: 10 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.dark.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: 14,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { color: colors.text.light, fontSize: 15, fontWeight: "700" },
  sub: { color: colors.text.secondary, fontSize: 12, marginTop: 2 },
});
