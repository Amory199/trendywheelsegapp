import { Ionicons } from "@expo/vector-icons";
import { isRTL } from "@trendywheels/i18n";
import { colors } from "@trendywheels/ui-tokens";
import { useRouter } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { useLocale, useT } from "../lib/locale";
import { useDisplay } from "../lib/typography";

import { SectionHeader } from "./SectionHeader";

const INK = "#02011F";
const MUTED = "rgba(2,1,31,0.55)";

// Evergreen service entry points, rendered as rich Talabat-style cards. Static
// config (icons + brand tints + routes + i18n keys) — no network. Each route is
// a public service/trade-in entry screen; the submit/booking step behind it is
// already fronted by <GuestGate>/useRequireAuth, so a guest browses freely and
// only the action prompts sign-in. Never a login wall on the home screen.
type Service = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  titleKey: string;
  subKey: string;
  route: string;
};

const SERVICES: Service[] = [
  {
    key: "maintenance",
    icon: "construct",
    tint: colors.brand.friendlyBlue,
    titleKey: "home.serviceMaintenance",
    subKey: "home.serviceMaintenanceSub",
    route: "/service/maintenance",
  },
  {
    key: "customize",
    icon: "color-palette",
    tint: colors.brand.trendyPink,
    titleKey: "home.serviceCustomize",
    subKey: "home.serviceCustomizeSub",
    route: "/service/customization",
  },
  {
    key: "delivery",
    icon: "cube",
    tint: colors.brand.poolBlue,
    titleKey: "home.serviceDelivery",
    subKey: "home.serviceDeliverySub",
    route: "/service/pickup-delivery",
  },
  {
    key: "tradeIn",
    icon: "swap-horizontal",
    tint: colors.brand.ecoLimelight,
    titleKey: "home.serviceTradeIn",
    subKey: "home.serviceTradeInSub",
    route: "/sell/trade-in",
  },
];

const CARD_W = 150;

/**
 * Horizontal rail of service shortcut cards for the home feed (Maintenance,
 * Customize, Delivery, Trade-in). Mirrors Rail's spacing rhythm and reuses the
 * shared <SectionHeader/>. Fully guest-safe: every card renders for everyone and
 * routes to a public entry screen — OTA-only, no network, no auth coupling.
 */
export function ServicesRail(): JSX.Element {
  const router = useRouter();
  const t = useT();
  const rtl = isRTL(useLocale((s) => s.locale));
  const display = useDisplay();

  return (
    <View style={styles.section}>
      <SectionHeader title={t("home.servicesTitle")} />
      <FlatList
        horizontal
        data={SERVICES}
        keyExtractor={(s) => s.key}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={Separator}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(item.route as never)}
            android_ripple={{ color: "rgba(43,15,248,0.10)", borderless: false }}
            style={({ pressed }) => [styles.card, pressed && { transform: [{ scale: 0.97 }] }]}
          >
            <View style={styles.cardTop}>
              <View style={[styles.iconWrap, { backgroundColor: item.tint + "1A" }]}>
                <Ionicons name={item.icon} size={22} color={item.tint} />
              </View>
              <Ionicons name={rtl ? "arrow-back" : "arrow-forward"} size={18} color={MUTED} />
            </View>
            <Text numberOfLines={1} style={[styles.title, display(0.3)]}>
              {t(item.titleKey)}
            </Text>
            <Text numberOfLines={2} style={styles.sub}>
              {t(item.subKey)}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

function Separator(): JSX.Element {
  return <View style={{ width: 12 }} />;
}

const styles = StyleSheet.create({
  section: { marginTop: 22 },
  listContent: { paddingHorizontal: 16 },
  card: {
    width: CARD_W,
    borderRadius: 20,
    backgroundColor: "#fff",
    padding: 14,
    gap: 8,
    shadowColor: INK,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 16, color: INK },
  sub: { fontSize: 12, color: MUTED, lineHeight: 16 },
});
