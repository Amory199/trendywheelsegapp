import { Ionicons } from "@expo/vector-icons";
import { VEHICLE_CATEGORIES, type VehicleCategory } from "@trendywheels/types";
import { colors, TAB_BAR_SAFE_BOTTOM } from "@trendywheels/ui-tokens";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { memo } from "react";
import { Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";

import { useT } from "../lib/locale";
import { useTheme } from "../lib/use-theme";

// Maps the VehicleCategory enum (English labels live in @trendywheels/types) to
// our localized home.categories.* keys, resolved at render so the strip reads
// fully in the active locale.
const CATEGORY_LABEL_KEYS: Record<VehicleCategory, string> = {
  "golf-cart": "home.categories.golf-cart",
  scooter: "home.categories.scooter",
  "scooter-sidecar": "home.categories.scooter-sidecar",
  buggy: "home.categories.buggy",
  utv: "home.categories.utv",
  "jet-ski": "home.categories.jet-ski",
  "hover-board": "home.categories.hover-board",
};

// 2026-05-21 — dropped per-tile videos. 7 simultaneous useVideoPlayer mounts
// were causing a 3s freeze on Rent/Sell tab entry on Android, plus the UTV
// asset decoded as garbled pink noise on real devices and the jet-ski clip
// had "Buy"/"Sell" baked into the source frames. Replaced with brand-gradient
// + Ionicon tiles — instant render, no decoder load, no bleed possible.
// Videos remain on Home (`(tabs)/index.tsx`) and Service (`(tabs)/repair.tsx`)
// heroes where they're a single instance, not a grid of 7.

// Per-category gradient — picks two brand-palette stops so the tile reads as
// a deliberate hero card, not a flat fallback.
const CATEGORY_GRADIENTS: Record<VehicleCategory, [string, string]> = {
  "golf-cart": [colors.brand.friendlyBlue, "#1a0b9e"],
  scooter: [colors.brand.trendyPink, "#7a0a4f"],
  "scooter-sidecar": [colors.brand.poolBlue, colors.brand.friendlyBlue],
  buggy: ["#f5b800", "#a55a00"],
  utv: ["#9c27b0", "#4a0a6b"],
  "jet-ski": [colors.brand.poolBlue, "#0a3a8a"],
  "hover-board": [colors.brand.trendyPink, colors.brand.friendlyBlue],
};

// Real per-category hero photos (bundled). Categories without one yet
// (plain scooter, hover-board) fall back to the gradient + icon tile below.
const CATEGORY_IMAGES: Partial<Record<VehicleCategory, number>> = {
  "golf-cart": require("../assets/categories/golf-cart.jpg"),
  "scooter-sidecar": require("../assets/categories/scooter-sidecar.jpg"),
  buggy: require("../assets/categories/buggy.jpg"),
  utv: require("../assets/categories/utv.jpg"),
  "jet-ski": require("../assets/categories/jet-ski.jpg"),
};

const SCREEN_W = Dimensions.get("window").width;
const H_PADDING = 14;
const GAP = 10;
const BLOCK_W = (SCREEN_W - H_PADDING * 2 - GAP) / 2;
const BLOCK_H = Math.round(BLOCK_W * 1.25); // 4:5 portrait

interface Props {
  value: VehicleCategory | "all" | null;
  onChange: (next: VehicleCategory | "all") => void;
  showAll?: boolean;
  // Optional Reanimated scroll handler from useTabBarScrollHandler — wires the
  // strip's scroll position into the tab-bar auto-hide on rent/sell where no
  // outer FlatList exists.
  onScroll?: ReturnType<typeof import("react-native-reanimated").useAnimatedScrollHandler>;
}

function CategoryStripImpl({ value, onChange, showAll = true, onScroll }: Props): JSX.Element {
  const { palette } = useTheme();
  const t = useT();
  return (
    <Animated.ScrollView
      contentContainerStyle={[styles.grid, { paddingBottom: TAB_BAR_SAFE_BOTTOM }]}
      showsVerticalScrollIndicator={false}
      horizontal={false}
      onScroll={onScroll}
      scrollEventThrottle={16}
      removeClippedSubviews
    >
      {showAll ? (
        <Pressable
          onPress={() => onChange("all")}
          android_ripple={{ color: "rgba(43,15,248,0.18)", borderless: false }}
          style={[
            styles.block,
            { backgroundColor: palette.card, borderColor: "transparent" },
            value === "all" && styles.blockActive,
          ]}
        >
          <LinearGradient
            colors={[colors.brand.poolBlue, colors.brand.friendlyBlue]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.iconWrap}>
            <Ionicons name="grid" size={40} color="rgba(255,255,255,0.95)" />
          </View>
          <BlockLabel label={t("home.allCategories")} active={value === "all"} />
        </Pressable>
      ) : null}
      {VEHICLE_CATEGORIES.map((c) => (
        <CategoryBlock
          key={c.key}
          categoryKey={c.key}
          label={t(CATEGORY_LABEL_KEYS[c.key] as Parameters<typeof t>[0])}
          icon={c.icon}
          active={value === c.key}
          onPress={() => onChange(c.key)}
        />
      ))}
    </Animated.ScrollView>
  );
}

export const CategoryStrip = memo(CategoryStripImpl);

function CategoryBlock({
  categoryKey,
  label,
  icon,
  active,
  onPress,
}: {
  categoryKey: VehicleCategory;
  label: string;
  icon: string;
  active: boolean;
  onPress: () => void;
}): JSX.Element {
  const gradient = CATEGORY_GRADIENTS[categoryKey] ?? [
    colors.brand.poolBlue,
    colors.brand.friendlyBlue,
  ];
  const image = CATEGORY_IMAGES[categoryKey];
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: "rgba(43,15,248,0.18)", borderless: false }}
      style={[styles.block, active && styles.blockActive]}
    >
      {image ? (
        // Real photo tile: image fills the block, dark veil keeps the label legible.
        <Image source={image} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
      ) : (
        // Fallback for categories without a photo yet (scooter, hover-board):
        // brand gradient + centred icon.
        <>
          <LinearGradient
            colors={gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.iconWrap}>
            <Ionicons
              name={icon as keyof typeof import("@expo/vector-icons").Ionicons.glyphMap}
              size={56}
              color="rgba(255,255,255,0.95)"
            />
          </View>
        </>
      )}
      {/* Bottom dark veil so the label text stays readable over photo or gradient. */}
      <LinearGradient
        colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.65)"]}
        style={[StyleSheet.absoluteFill, { top: BLOCK_H * 0.45 }]}
        pointerEvents="none"
      />
      <BlockLabel label={label} active={active} />
    </Pressable>
  );
}

function BlockLabel({ label, active }: { label: string; active: boolean }): JSX.Element {
  return (
    <View style={styles.labelWrap}>
      <Text style={styles.labelText} numberOfLines={1}>
        {label}
      </Text>
      {active ? <View style={styles.activeUnderline} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: H_PADDING,
    paddingTop: 12,
    paddingBottom: 6,
    gap: GAP,
  },
  block: {
    width: BLOCK_W,
    height: BLOCK_H,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
  },
  blockActive: {
    borderColor: colors.brand.trendyPink,
  },
  iconWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  labelWrap: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
  },
  labelText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  activeUnderline: {
    marginTop: 4,
    height: 3,
    width: 28,
    borderRadius: 999,
    backgroundColor: colors.brand.trendyPink,
  },
});
