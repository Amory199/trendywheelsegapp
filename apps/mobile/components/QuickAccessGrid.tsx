import { Ionicons } from "@expo/vector-icons";
import { colors } from "@trendywheels/ui-tokens";
import { useRouter } from "expo-router";
import * as React from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { useT } from "../lib/locale";

const INK = "#02011F";
const GREEN = "#16A34A";
const AMBER = "#F5B800";

// Talabat-style quick-access grid: every main flow one tap from the home
// screen. Tiles deep-link straight into the relevant tab/route (all verified
// to exist). Labels are i18n keys (en/ar parity); icons + brand tints stay
// locale-agnostic.
type Tile = {
  labelKey: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  route: string;
};

const TILES: Tile[] = [
  {
    labelKey: "home.quickBuy",
    icon: "bag-handle",
    tint: colors.brand.friendlyBlue,
    route: "/(tabs)/buy",
  },
  { labelKey: "home.quickRent", icon: "key", tint: colors.brand.poolBlue, route: "/(tabs)/rent" },
  {
    labelKey: "home.quickSell",
    icon: "pricetag",
    tint: colors.brand.trendyPink,
    route: "/(tabs)/sell",
  },
  { labelKey: "home.quickTradeIn", icon: "swap-horizontal", tint: GREEN, route: "/sell/trade-in" },
  {
    labelKey: "home.quickMaintenance",
    icon: "construct",
    tint: AMBER,
    route: "/service/maintenance",
  },
  {
    labelKey: "home.quickCustomization",
    icon: "color-palette",
    tint: colors.brand.trendyPink,
    route: "/service/customization",
  },
  {
    labelKey: "home.quickDelivery",
    icon: "cube",
    tint: colors.brand.poolBlue,
    route: "/service/pickup-delivery",
  },
  {
    labelKey: "home.quickSupport",
    icon: "headset",
    tint: colors.brand.friendlyBlue,
    route: "/support/tickets",
  },
];

const H_PAD = 16;
const GAP = 10;
const COLS = 4;

export function QuickAccessGrid(): React.JSX.Element {
  const router = useRouter();
  const t = useT();
  const { width } = useWindowDimensions();
  const tileW = (width - H_PAD * 2 - GAP * (COLS - 1)) / COLS;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t("home.quickTitle")}</Text>
      <View style={styles.grid}>
        {TILES.map((tile) => (
          <Pressable
            key={tile.labelKey}
            style={[styles.tile, { width: tileW }]}
            onPress={() => router.push(tile.route as never)}
            hitSlop={4}
          >
            <View style={[styles.iconWrap, { backgroundColor: tile.tint + "1A" }]}>
              <Ionicons name={tile.icon} size={22} color={tile.tint} />
            </View>
            <Text style={styles.label} numberOfLines={1}>
              {t(tile.labelKey)}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 18 },
  title: {
    fontSize: 15,
    fontWeight: "800",
    color: INK,
    paddingHorizontal: H_PAD,
    marginBottom: 12,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GAP,
    paddingHorizontal: H_PAD,
  },
  tile: { alignItems: "center", gap: 6 },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontSize: 11, color: INK, fontWeight: "700", textAlign: "center" },
});
