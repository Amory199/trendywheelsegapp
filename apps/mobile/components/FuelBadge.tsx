import { colors } from "@trendywheels/ui-tokens";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { useT } from "../lib/locale";

/**
 * Trendy Pink fuel-type pill — pink is reserved brand-wide for this badge
 * (never a category outline). Renders only for the combustion fuels
 * (gasoline / hybrid); electric — the fleet default — and unknown values
 * stay badge-free so the pill always means "this one burns fuel".
 */
export function FuelBadge({
  fuelType,
  style,
}: {
  fuelType?: string | null;
  style?: StyleProp<ViewStyle>;
}): JSX.Element | null {
  const t = useT();
  if (fuelType !== "gasoline" && fuelType !== "hybrid") return null;
  // Narrowed literals — sell.fuel.* is the shared localized fuel label source.
  const label = fuelType === "gasoline" ? t("sell.fuel.gasoline") : t("sell.fuel.hybrid");
  return (
    <View style={[styles.pill, style]}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "rgba(255,0,101,0.12)",
    borderWidth: 1,
    borderColor: colors.brand.trendyPink,
  },
  text: { color: colors.brand.trendyPink, fontSize: 10, fontWeight: "800" },
});
