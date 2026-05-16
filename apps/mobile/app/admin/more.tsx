import { Ionicons } from "@expo/vector-icons";
import { colors } from "@trendywheels/ui-tokens";
import * as Linking from "expo-linking";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

// Admin "More" tab — surfaces that aren't (yet) native on mobile open the
// existing web dashboard. Acts as the bridge while we port more screens.

interface Tool {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sub: string;
  href: string; // web url
}

const TOOLS: Tool[] = [
  {
    icon: "cube-outline",
    label: "Vehicles",
    sub: "Add, edit, delete fleet",
    href: "https://admin.trendywheelseg.com/vehicles",
  },
  {
    icon: "pricetags-outline",
    label: "Sales listings",
    sub: "Approve customer listings",
    href: "https://admin.trendywheelseg.com/sales",
  },
  {
    icon: "construct-outline",
    label: "Repairs",
    sub: "Open work orders",
    href: "https://admin.trendywheelseg.com/repairs",
  },
  {
    icon: "headset-outline",
    label: "Support tickets",
    sub: "Open issues",
    href: "https://admin.trendywheelseg.com/support-tickets",
  },
  {
    icon: "trending-up-outline",
    label: "Leads",
    sub: "CRM pipeline",
    href: "https://admin.trendywheelseg.com/leads",
  },
  {
    icon: "swap-horizontal-outline",
    label: "Trade-ins",
    sub: "Quote queue",
    href: "https://admin.trendywheelseg.com/trade-ins",
  },
  {
    icon: "bus-outline",
    label: "Transport",
    sub: "Schedule queue",
    href: "https://admin.trendywheelseg.com/transport",
  },
  {
    icon: "cash-outline",
    label: "Orders",
    sub: "Parts + accessories",
    href: "https://admin.trendywheelseg.com/orders",
  },
  {
    icon: "gift-outline",
    label: "Promo codes",
    sub: "Create + manage",
    href: "https://admin.trendywheelseg.com/promo-codes",
  },
  {
    icon: "megaphone-outline",
    label: "Broadcasts",
    sub: "Send to all users",
    href: "https://admin.trendywheelseg.com/broadcasts",
  },
  {
    icon: "document-text-outline",
    label: "Audit log",
    sub: "Every change tracked",
    href: "https://admin.trendywheelseg.com/audit-log",
  },
  {
    icon: "settings-outline",
    label: "System config",
    sub: "Company, tax, hours",
    href: "https://admin.trendywheelseg.com/settings",
  },
];

export default function AdminMore(): JSX.Element {
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>More tools</Text>
        <Text style={styles.subtitle}>
          Tap any tool to open the full dashboard in your browser. Native screens are being rolled
          out tab by tab.
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        {TOOLS.map((t) => (
          <TouchableOpacity
            key={t.href}
            style={styles.row}
            onPress={() => void Linking.openURL(t.href)}
          >
            <View style={styles.icon}>
              <Ionicons name={t.icon} size={20} color={colors.brand.friendlyBlue} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{t.label}</Text>
              <Text style={styles.sub}>{t.sub}</Text>
            </View>
            <Ionicons name="open-outline" size={18} color={colors.text.secondary} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.dark.bg },
  header: { paddingTop: 56, paddingHorizontal: 18, paddingBottom: 14 },
  title: { color: colors.text.light, fontSize: 24, fontWeight: "700" },
  subtitle: { color: colors.text.secondary, fontSize: 12, marginTop: 6, lineHeight: 16 },
  scroll: { padding: 14, paddingBottom: 120, gap: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.dark.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: 12,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.brand.friendlyBlue + "22",
    alignItems: "center",
    justifyContent: "center",
  },
  label: { color: colors.text.light, fontSize: 14, fontWeight: "700" },
  sub: { color: colors.text.secondary, fontSize: 11, marginTop: 2 },
});
