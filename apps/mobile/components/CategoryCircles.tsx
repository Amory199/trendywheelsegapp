import { type VehicleCategory, VEHICLE_CATEGORIES } from "@trendywheels/types";
import { Image } from "expo-image";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useT } from "../lib/locale";
import { useTheme } from "../lib/use-theme";

// Mirrors CategoryStrip's image map. All 7 categories now have art; kept local
// so this lightweight row carries no dependency on the heavier strip component.
const CATEGORY_IMAGES: Record<VehicleCategory, number> = {
  "golf-cart": require("../assets/categories/golf-cart.jpg"),
  scooter: require("../assets/categories/scooter.jpg"),
  "scooter-sidecar": require("../assets/categories/scooter-sidecar.jpg"),
  buggy: require("../assets/categories/buggy.jpg"),
  utv: require("../assets/categories/utv.jpg"),
  "jet-ski": require("../assets/categories/jet-ski.jpg"),
  "hover-board": require("../assets/categories/hover-board.jpg"),
};

interface Props {
  onPress: (key: VehicleCategory) => void;
}

/** Talabat-style round category shortcuts for the home discovery feed. */
export function CategoryCircles({ onPress }: Props): JSX.Element {
  const t = useT();
  const { palette } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      {VEHICLE_CATEGORIES.map((c) => (
        <Pressable
          key={c.key}
          onPress={() => onPress(c.key)}
          style={({ pressed }) => [styles.item, pressed && { opacity: 0.7 }]}
        >
          <View style={styles.circle}>
            <Image
              source={CATEGORY_IMAGES[c.key]}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={200}
            />
          </View>
          <Text numberOfLines={1} style={[styles.label, { color: palette.text }]}>
            {t(`home.categories.${c.key}`)}
          </Text>
        </Pressable>
      ))}
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
    backgroundColor: "#EAEAF0",
    borderWidth: 1,
    borderColor: "rgba(2,1,31,0.06)",
  },
  label: { marginTop: 6, fontSize: 11, fontWeight: "600", textAlign: "center" },
});
