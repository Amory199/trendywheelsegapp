import { Ionicons } from "@expo/vector-icons";
import { VEHICLE_CATEGORIES, type VehicleCategory } from "@trendywheels/types";
import { colors } from "@trendywheels/ui-tokens";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

const CATEGORY_VIDEOS: Partial<Record<VehicleCategory, number>> = {
  "golf-cart": require("../assets/category/golf-cart.mp4"),
  scooter: require("../assets/category/scooter.mp4"),
  "jet-ski": require("../assets/category/jet-ski.mp4"),
};

interface Props {
  value: VehicleCategory | "all";
  onChange: (next: VehicleCategory | "all") => void;
  showAll?: boolean;
}

export function CategoryStrip({ value, onChange, showAll = true }: Props): JSX.Element {
  const [previewKey, setPreviewKey] = useState<VehicleCategory | null>(
    value !== "all" ? value : null,
  );

  useEffect(() => {
    if (value !== "all") setPreviewKey(value);
  }, [value]);

  const hasVideo = previewKey && CATEGORY_VIDEOS[previewKey];

  return (
    <View>
      {hasVideo ? <CategoryHero categoryKey={previewKey!} /> : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.strip}
      >
        {showAll ? (
          <Pressable
            onPress={() => onChange("all")}
            style={[styles.chip, value === "all" && styles.chipActive]}
          >
            <Ionicons
              name="grid-outline"
              size={14}
              color={value === "all" ? "#000" : colors.text.secondary}
            />
            <Text style={[styles.chipText, value === "all" && styles.chipTextActive]}>All</Text>
          </Pressable>
        ) : null}
        {VEHICLE_CATEGORIES.map((c) => {
          const active = value === c.key;
          return (
            <Pressable
              key={c.key}
              onPress={() => onChange(c.key)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Ionicons
                name={c.icon as keyof typeof Ionicons.glyphMap}
                size={14}
                color={active ? "#000" : colors.text.secondary}
              />
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function CategoryHero({ categoryKey }: { categoryKey: VehicleCategory }): JSX.Element {
  const source = CATEGORY_VIDEOS[categoryKey]!;
  const player = useVideoPlayer(source, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  return (
    <View style={styles.hero}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    height: 180,
    marginHorizontal: 14,
    marginTop: 10,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  strip: { paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: colors.brand.poolBlue,
    borderColor: colors.brand.poolBlue,
  },
  chipText: { color: colors.text.secondary, fontSize: 12, fontWeight: "700" },
  chipTextActive: { color: "#000" },
});
