import { Ionicons } from "@expo/vector-icons";
import { isRTL } from "@trendywheels/i18n";
import { colors } from "@trendywheels/ui-tokens";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { useLocale, useT } from "../lib/locale";
import { useDisplay } from "../lib/typography";
import { useTheme } from "../lib/use-theme";

import { SectionHeader } from "./SectionHeader";

// INK stays only as an opaque shadow color; surfaces/text read from the palette.
const INK = "#02011F";

// Evergreen service entry points, rendered as rich Talabat-style cards. Static
// config (icons + brand tints + routes + i18n keys) — no network. Each route is
// a public service/trade-in entry screen; the submit/booking step behind it is
// already fronted by <GuestGate>/useRequireAuth, so a guest browses freely and
// only the action prompts sign-in. Never a login wall on the home screen.
type Service = {
  key: string;
  img: number;
  tint: string;
  titleKey: string;
  subKey: string;
  route: string;
};

// Branded service icons (sliced from the official icon board) replace the old
// generic line-icons, matching the home category/quick-action tiles.
const SERVICES: Service[] = [
  {
    key: "maintenance",
    img: require("../assets/icons/maintenance.png"),
    tint: colors.brand.friendlyBlue,
    titleKey: "home.serviceMaintenance",
    subKey: "home.serviceMaintenanceSub",
    route: "/service/maintenance",
  },
  {
    key: "customize",
    img: require("../assets/icons/customize.png"),
    tint: colors.brand.trendyPink,
    titleKey: "home.serviceCustomize",
    subKey: "home.serviceCustomizeSub",
    route: "/service/customization",
  },
  {
    key: "delivery",
    img: require("../assets/icons/delivery.png"),
    tint: colors.brand.poolBlue,
    titleKey: "home.serviceDelivery",
    subKey: "home.serviceDeliverySub",
    route: "/service/pickup-delivery",
  },
  {
    key: "tradeIn",
    img: require("../assets/icons/trade-in.png"),
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
  const { palette } = useTheme();

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
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: palette.card, borderWidth: 1, borderColor: palette.hairline },
              pressed && { transform: [{ scale: 0.97 }] },
            ]}
          >
            <View style={styles.cardTop}>
              <View style={styles.iconWrap}>
                <Image source={item.img} style={styles.iconImg} contentFit="contain" />
              </View>
              <Ionicons
                name={rtl ? "arrow-back" : "arrow-forward"}
                size={18}
                color={palette.muted}
              />
            </View>
            <Text numberOfLines={1} style={[styles.title, display(0.3), { color: palette.text }]}>
              {t(item.titleKey)}
            </Text>
            <Text numberOfLines={2} style={[styles.sub, { color: palette.muted }]}>
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
    backgroundColor: "#0c0b3a",
  },
  iconImg: { width: 34, height: 34 },
  title: { fontSize: 16, color: INK },
  sub: { fontSize: 12, lineHeight: 16 },
});
