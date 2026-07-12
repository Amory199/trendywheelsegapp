import { type VehicleCategory } from "@trendywheels/types";
import { categoryColorOf, colors } from "@trendywheels/ui-tokens";
import { Image } from "expo-image";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useT } from "../lib/locale";
import { useTheme } from "../lib/use-theme";
import { useVisibleCategories } from "../lib/use-visible-categories";

import { CategoryOutline } from "./CategoryOutline";

// Branded category icons (sliced from the official icon board). Transparent
// PNGs shown on a white circle ringed with the category's brand color so the
// artwork pops in both light and dark app themes. Exported so the rent
// CategoryStrip's "All" tile can reuse the same artwork.
export const CATEGORY_ICONS: Record<VehicleCategory, number> = {
  "golf-cart": require("../assets/icons/golf-cart.png"),
  scooter: require("../assets/icons/scooter.png"),
  "scooter-sidecar": require("../assets/icons/scooter-sidecar.png"),
  buggy: require("../assets/icons/buggy.png"),
  utv: require("../assets/icons/utv.png"),
  "jet-ski": require("../assets/icons/jet-ski.png"),
  "hover-board": require("../assets/icons/hover-board.png"),
};

interface Props {
  onPress: (key: VehicleCategory) => void;
  /** When set, the circles act as a FILTER: the selected one gets a pink ring. */
  selected?: VehicleCategory | null;
}

/** Talabat-style round category shortcuts for the home discovery feed. */
export function CategoryCircles({ onPress, selected }: Props): JSX.Element {
  const t = useT();
  const { palette } = useTheme();
  const categories = useVisibleCategories();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      {categories.map((c) => {
        const active = selected === c.key;
        const outline = categoryColorOf(c.key);
        const icon = (
          <Image
            source={CATEGORY_ICONS[c.key]}
            style={styles.icon}
            contentFit="contain"
            transition={200}
          />
        );
        return (
          <Pressable
            key={c.key}
            onPress={() => onPress(c.key)}
            style={({ pressed }) => [styles.item, pressed && { opacity: 0.7 }]}
          >
            {!active && outline?.length === 2 ? (
              // Duo categories get a two-stop gradient ring; the pink selected
              // ring below always wins over the category color.
              <CategoryOutline colors={outline} radius={CIRCLE / 2} style={styles.circleDuo}>
                <View style={styles.circleInner}>{icon}</View>
              </CategoryOutline>
            ) : (
              <View
                style={[
                  styles.circle,
                  outline ? { borderColor: outline[0] } : null,
                  active && styles.circleActive,
                ]}
              >
                {icon}
              </View>
            )}
            <Text
              numberOfLines={1}
              style={[
                styles.label,
                { color: palette.text },
                active && { color: colors.brand.trendyPink, fontWeight: "800" },
              ]}
            >
              {t(`home.categories.${c.key}`)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const CIRCLE = 64;

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, gap: 14 },
  item: { width: CIRCLE + 8, alignItems: "center" },
  circle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(43,15,248,0.25)", // fallback for unmapped categories
  },
  circleActive: {
    borderWidth: 2,
    borderColor: colors.brand.trendyPink,
  },
  circleDuo: { width: CIRCLE, height: CIRCLE },
  circleInner: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: { width: CIRCLE - 8, height: CIRCLE - 8 },
  label: { marginTop: 6, fontSize: 11, fontWeight: "600", textAlign: "center" },
});
