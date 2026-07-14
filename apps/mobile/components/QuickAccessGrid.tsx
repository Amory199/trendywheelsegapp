import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as React from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { useT } from "../lib/locale";
import { useTheme } from "../lib/use-theme";

// Talabat-style quick-access grid: every main flow one tap from the home
// screen. Tiles deep-link straight into the relevant tab/route (all verified
// to exist). Labels are i18n keys (en/ar parity); the branded action icons
// (sliced from the official icon board) stay locale-agnostic.
type Tile = {
  labelKey: string;
  img: number;
  route: string;
};

const TILES: Tile[] = [
  { labelKey: "home.quickBuy", img: require("../assets/icons/buy.png"), route: "/(tabs)/buy" },
  { labelKey: "home.quickRent", img: require("../assets/icons/rent.png"), route: "/(tabs)/rent" },
  { labelKey: "home.quickSell", img: require("../assets/icons/sell.png"), route: "/(tabs)/sell" },
  {
    labelKey: "home.quickTradeIn",
    img: require("../assets/icons/trade-in.png"),
    route: "/sell/trade-in",
  },
  {
    labelKey: "home.quickMaintenance",
    img: require("../assets/icons/maintenance.png"),
    route: "/service/maintenance",
  },
  {
    labelKey: "home.quickCustomization",
    img: require("../assets/icons/customize.png"),
    route: "/service/customization",
  },
  {
    labelKey: "home.quickDelivery",
    img: require("../assets/icons/delivery.png"),
    route: "/service/pickup-delivery",
  },
  {
    labelKey: "home.quickSupport",
    img: require("../assets/icons/support.png"),
    route: "/support/tickets",
  },
];

const H_PAD = 16;
const GAP = 10;
const COLS = 4;

export function QuickAccessGrid(): React.JSX.Element {
  const router = useRouter();
  const t = useT();
  const { palette } = useTheme();
  const { width } = useWindowDimensions();
  const tileW = (width - H_PAD * 2 - GAP * (COLS - 1)) / COLS;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: palette.text }]}>{t("home.quickTitle")}</Text>
      <View style={styles.grid}>
        {TILES.map((tile) => (
          <Pressable
            key={tile.labelKey}
            style={[styles.tile, { width: tileW }]}
            onPress={() => router.push(tile.route as never)}
            hitSlop={4}
          >
            <View style={styles.iconWrap}>
              <Image source={tile.img} style={styles.iconImg} contentFit="contain" />
            </View>
            <Text style={[styles.label, { color: palette.text }]} numberOfLines={1}>
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
    // White chip so the 3D brand icons read cleanly (matches the category
    // circles). Neutral hairline + soft shadow keep it defined on light bg too.
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(2,1,31,0.12)",
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  iconImg: { width: 44, height: 44 },
  label: { fontSize: 11, fontWeight: "700", textAlign: "center" },
});
