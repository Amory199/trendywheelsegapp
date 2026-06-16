import { Ionicons } from "@expo/vector-icons";
import { isRTL } from "@trendywheels/i18n";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useLocale } from "../lib/locale";
import { useDisplay } from "../lib/typography";

const INK = "#02011F";

interface SectionHeaderProps {
  /** Already-translated section title (caller passes t("home.<key>")). */
  title: string;
  /** Already-translated "see all" label; required to render the action. */
  seeAllLabel?: string;
  /** When provided (with seeAllLabel), renders a tappable see-all → chevron. */
  onSeeAll?: () => void;
}

/**
 * Reusable, RTL-aware section title row for the home feed's non-Rail sections
 * (e.g. "Shop by type", "Services"). Matches Rail's built-in header styling so
 * the page reads consistently. Purely presentational — no data, no auth, no
 * navigation of its own beyond the optional onSeeAll the parent supplies.
 */
export function SectionHeader({ title, seeAllLabel, onSeeAll }: SectionHeaderProps): JSX.Element {
  const locale = useLocale((s) => s.locale);
  const rtl = isRTL(locale);
  const display = useDisplay();

  return (
    <View style={styles.header}>
      <Text style={[styles.title, display(0.3)]}>{title}</Text>
      {onSeeAll && seeAllLabel ? (
        <Pressable onPress={onSeeAll} hitSlop={10} style={styles.seeAll}>
          <Text style={styles.seeAllText}>{seeAllLabel}</Text>
          <Ionicons name={rtl ? "chevron-back" : "chevron-forward"} size={14} color={INK} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  title: { fontSize: 22, color: INK },
  seeAll: { flexDirection: "row", alignItems: "center", gap: 2 },
  seeAllText: { fontSize: 13, fontWeight: "700", color: INK },
});
