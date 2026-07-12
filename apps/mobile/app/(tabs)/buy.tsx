import { Ionicons } from "@expo/vector-icons";
import { spacing } from "@trendywheels/ui-tokens";
import { useRouter } from "expo-router";
import * as React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CategoryStrip } from "../../components/CategoryStrip";
import { TWAurora } from "../../components/ui";
import { useT } from "../../lib/locale";
import { useTabBarScrollHandler } from "../../lib/tab-bar-scroll";
import { useTheme } from "../../lib/use-theme";

// Buy mirrors Rent exactly: a full category photo-grid. Tapping a category
// opens that category's buy page (/buy/category/[key]); the "All categories"
// tile opens /buy/category/all which lists everything (carts + parts + access.).
export default function BuyScreen(): React.JSX.Element {
  const router = useRouter();
  const { palette } = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const scrollHandler = useTabBarScrollHandler();

  return (
    <View style={[styles.container, { backgroundColor: palette.bg }]}>
      <TWAurora variant="ambient" />
      <View
        style={[
          styles.header,
          {
            backgroundColor: palette.card,
            borderBottomColor: palette.border,
            paddingTop: insets.top + 12,
          },
        ]}
      >
        <Text style={[styles.eyebrow, { color: palette.muted }]}>
          TRENDY<Text style={styles.eyebrowDot}>.</Text>WHEELS
        </Text>
        <Text style={[styles.title, { color: palette.text }]}>{t("buy.catalogTitle")}</Text>
        <View style={styles.subtitleRow}>
          <Ionicons name="hand-left-outline" size={14} color={palette.muted} />
          <Text style={[styles.subtitle, { color: palette.muted }]}>
            {t("buy.catalogSubtitle")}
          </Text>
        </View>
      </View>

      <CategoryStrip
        value={null}
        onChange={(next) => router.push(`/buy/category/${next}` as never)}
        onScroll={scrollHandler}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
  },
  eyebrowDot: { color: "#FF0065" },
  title: { fontSize: 34, fontWeight: "800", marginTop: 2 },
  subtitleRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  subtitle: { fontSize: 14 },
});
