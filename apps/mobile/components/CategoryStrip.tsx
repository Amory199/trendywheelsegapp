import { Ionicons } from "@expo/vector-icons";
import { VEHICLE_CATEGORIES, type VehicleCategory } from "@trendywheels/types";
import { colors } from "@trendywheels/ui-tokens";
import { useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useVideoPlayer, VideoView } from "expo-video";
import { useCallback } from "react";
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

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
}

export function CategoryStrip({ value, onChange, showAll = true }: Props): JSX.Element {
  return (
    <ScrollView
      contentContainerStyle={styles.grid}
      showsVerticalScrollIndicator={false}
      horizontal={false}
    >
      {showAll ? (
        <Pressable
          onPress={() => onChange("all")}
          style={[styles.block, value === "all" && styles.blockActive]}
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
    </ScrollView>
  );
}

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
  const source = CATEGORY_VIDEOS[categoryKey] ?? null;
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: "rgba(43,15,248,0.18)", borderless: false }}
      style={[styles.block, active && styles.blockActive]}
    >
      {/* Defensive double-clip: even if VideoView paints a few pixels past its
          frame, this inner View masks it so neighboring tiles don't bleed. */}
      <View style={styles.mediaClip}>
        {source ? <BlockVideo source={source} /> : <BlockFallback icon={icon} />}
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
    />
  );
}

function BlockFallback({ icon }: { icon: string }): JSX.Element {
  return (
    <View style={[StyleSheet.absoluteFill, styles.fallback]}>
      <Ionicons
        name={icon as keyof typeof import("@expo/vector-icons").Ionicons.glyphMap}
        size={44}
        color="rgba(255,255,255,0.55)"
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
    backgroundColor: colors.dark.card,
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
    backgroundColor: colors.dark.card,
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
