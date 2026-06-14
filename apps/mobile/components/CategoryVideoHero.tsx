// Per-category landing hero: a single video player playing the .mp4 for the
// chosen category, with a dark veil + category label overlay. Used at the top
// of /rent/category/[key] and /sell/category/[key]. ONE player at a time, never
// in a grid — the perf cost is on par with the Repair tab hero.
//
// If the category has no video (or "all"), renders a brand-gradient fallback
// so the page still has a hero block.

import { Ionicons } from "@expo/vector-icons";
import { type VehicleCategory } from "@trendywheels/types";
import { colors } from "@trendywheels/ui-tokens";
import { LinearGradient } from "expo-linear-gradient";
import { useVideoPlayer, VideoView } from "expo-video";
import * as React from "react";
import { Text, View } from "react-native";

import { useDisplay } from "../lib/typography";

const VIDEO_SOURCES: Record<VehicleCategory, number | null> = {
  "golf-cart": require("../assets/category/golf-cart.mp4"),
  scooter: require("../assets/category/scooter.mp4"),
  "scooter-sidecar": require("../assets/category/scooter-sidecar.mp4"),
  buggy: require("../assets/category/buggy.mp4"),
  utv: require("../assets/category/utv.mp4"),
  "jet-ski": require("../assets/category/jet-ski.mp4"),
  "hover-board": require("../assets/category/hover-board.mp4"),
};

const FALLBACK_GRADIENT: [string, string] = [colors.brand.trendyPink, colors.brand.friendlyBlue];

interface Props {
  categoryKey: string | VehicleCategory;
  label: string;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  height?: number;
}

export function CategoryVideoHero({
  categoryKey,
  label,
  icon,
  height = 220,
}: Props): React.JSX.Element {
  const display = useDisplay();
  const source = VIDEO_SOURCES[categoryKey as VehicleCategory] ?? null;
  const player = useVideoPlayer(source, (p) => {
    if (!p) return;
    p.loop = true;
    p.muted = true;
    p.play();
  });

  return (
    <View style={{ width: "100%", height, overflow: "hidden", backgroundColor: "#000" }}>
      {source ? (
        <VideoView
          player={player}
          style={{ width: "100%", height }}
          contentFit="cover"
          nativeControls={false}
        />
      ) : (
        <LinearGradient
          colors={FALLBACK_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ width: "100%", height }}
        />
      )}
      {/* Bottom-to-top dark veil so the label is readable on any frame. */}
      <LinearGradient
        colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.55)"]}
        style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: height * 0.6 }}
      />
      <View
        style={{
          position: "absolute",
          left: 20,
          right: 20,
          bottom: 18,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        }}
      >
        {icon ? <Ionicons name={icon} size={28} color="#fff" /> : null}
        <Text
          style={[
            {
              color: "#fff",
              fontSize: 28,
            },
            display(0.6),
          ]}
        >
          {label}
        </Text>
      </View>
    </View>
  );
}
