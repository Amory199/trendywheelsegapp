import { type VehicleCategory } from "@trendywheels/types";
import { colors } from "@trendywheels/ui-tokens";
import { Image } from "expo-image";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useT } from "../lib/locale";
import { useTheme } from "../lib/use-theme";
import { useVisibleCategories } from "../lib/use-visible-categories";

// Branded category icons (sliced from the official icon board). Transparent
// PNGs shown on a dark brand circle so the artwork pops the same way it does on
// the brand sheet, in both light and dark app themes.
const CATEGORY_IMAGES: Record<VehicleCategory, number> = {
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
        return (
          <Pressable
            key={c.key}
            onPress={() => onPress(c.key)}
            style={({ pressed }) => [styles.item, pressed && { opacity: 0.7 }]}
          >
            <View style={[styles.circle, active && styles.circleActive]}>
              <Image
                source={CATEGORY_IMAGES[c.key]}
                style={styles.icon}
                contentFit="contain"
                transition={200}
              />
            </View>
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
    backgroundColor: "#0c0b3a",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(43,15,248,0.25)",
  },
  circleActive: {
    borderWidth: 2,
    borderColor: colors.brand.trendyPink,
  },
  icon: { width: CIRCLE - 8, height: CIRCLE - 8 },
  label: { marginTop: 6, fontSize: 11, fontWeight: "600", textAlign: "center" },
});
