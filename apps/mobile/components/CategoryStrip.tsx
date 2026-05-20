import { Ionicons } from "@expo/vector-icons";
import { VEHICLE_CATEGORIES, type VehicleCategory } from "@trendywheels/types";
import { colors, TAB_BAR_SAFE_BOTTOM } from "@trendywheels/ui-tokens";
import { useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useVideoPlayer, VideoView } from "expo-video";
import { memo, useCallback } from "react";
import Animated from "react-native-reanimated";
import { Dimensions, Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "../lib/use-theme";

const CATEGORY_VIDEOS: Partial<Record<VehicleCategory, number>> = {
  "golf-cart": require("../assets/category/golf-cart.mp4"),
  scooter: require("../assets/category/scooter.mp4"),
  "scooter-sidecar": require("../assets/category/scooter-sidecar.mp4"),
  buggy: require("../assets/category/buggy.mp4"),
  "jet-ski": require("../assets/category/jet-ski.mp4"),
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
  return (
    <Animated.ScrollView
      contentContainerStyle={[styles.grid, { paddingBottom: TAB_BAR_SAFE_BOTTOM }]}
      showsVerticalScrollIndicator={false}
      horizontal={false}
      onScroll={onScroll}
      scrollEventThrottle={16}
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
          <View style={styles.allBadge}>
            <Ionicons name="grid" size={28} color="#fff" />
          </View>
          <BlockLabel label="All categories" active={value === "all"} />
        </Pressable>
      ) : null}
      {VEHICLE_CATEGORIES.map((c) => (
        <CategoryBlock
          key={c.key}
          categoryKey={c.key}
          label={c.label}
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
  const { palette } = useTheme();
  const source = CATEGORY_VIDEOS[categoryKey] ?? null;
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: "rgba(43,15,248,0.18)", borderless: false }}
      style={[styles.block, { backgroundColor: palette.card }, active && styles.blockActive]}
    >
      {/* Defensive double-clip: even if VideoView paints a few pixels past its
          frame, this inner View masks it so neighboring tiles don't bleed. */}
      <View style={styles.mediaClip}>
        {source ? <BlockVideo source={source} /> : <BlockFallback icon={icon} palette={palette} />}
      </View>
      <LinearGradient
        colors={["rgba(2,1,31,0)", "rgba(2,1,31,0.88)"]}
        style={[StyleSheet.absoluteFill, { top: BLOCK_H * 0.5 }]}
        pointerEvents="none"
      />
      <BlockLabel label={label} active={active} />
    </Pressable>
  );
}

function BlockVideo({ source }: { source: number }): JSX.Element {
  const player = useVideoPlayer(source, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  // On focus, force a play() in case the previous pause-on-unmount path left
  // the player in a stopped state with a black texture. Skip the pause-on-blur
  // entirely — pausing forces expo-video to release its hardware surface on
  // some Androids and the surface fails to reattach, showing a black frame.
  // Keeping ~5 short looping videos active is cheap on modern devices.
  useFocusEffect(
    useCallback(() => {
      try {
        player.play();
      } catch {
        // player may be released during fast unmounts; safe to ignore.
      }
      return undefined;
    }, [player]),
  );
  return (
    <VideoView
      player={player}
      style={styles.media}
      contentFit="cover"
      nativeControls={false}
      pointerEvents="none"
      // Android: SurfaceView is the default but it renders OUTSIDE the React
      // Native view tree's clip boundaries, so neighboring tiles see baked-in
      // text from this tile's video ("UTV & BUGGIES" bleeding into UTV).
      // TextureView is GPU-composited inside the RN view tree and respects
      // overflow:hidden. Slightly more GPU cost, fully clipped — exactly the
      // trade-off the user wants.
      surfaceType="textureView"
    />
  );
}

function BlockFallback({
  icon,
  palette,
}: {
  icon: string;
  palette: import("@trendywheels/ui-tokens").Palette;
}): JSX.Element {
  return (
    <View style={[StyleSheet.absoluteFill, styles.fallback, { backgroundColor: palette.card }]}>
      <Ionicons
        name={icon as keyof typeof import("@expo/vector-icons").Ionicons.glyphMap}
        size={44}
        color={palette.muted}
      />
    </View>
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
  // Inner clip must match the outer block's borderRadius exactly. A 2px mismatch
  // (the previous 16 vs 18) leaves a hairline ring where the native video
  // surface can paint outside the rounded corner, which on Android shows up as
  // the previous tile's frame bleeding into the next one.
  mediaClip: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
    borderRadius: 18,
  },
  media: {
    width: "100%",
    height: "100%",
  },
  fallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  allBadge: {
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
