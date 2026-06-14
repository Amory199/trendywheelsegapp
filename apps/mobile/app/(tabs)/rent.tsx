import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "@trendywheels/ui-tokens";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CategoryStrip } from "../../components/CategoryStrip";
import { useT } from "../../lib/locale";
import { useTabBarScrollHandler } from "../../lib/tab-bar-scroll";
import { useTheme } from "../../lib/use-theme";

export default function RentScreen(): JSX.Element {
  const router = useRouter();
  const { palette } = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const scrollHandler = useTabBarScrollHandler();

  return (
    <View style={[styles.container, { backgroundColor: palette.bg }]}>
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
        <Text style={[styles.title, { color: palette.text }]}>{t("rent.findYourRide")}</Text>
        <View style={styles.subtitleRow}>
          <Ionicons name="hand-left-outline" size={14} color={palette.muted} />
          <Text style={[styles.subtitle, { color: palette.muted }]}>{t("rent.pickCategory")}</Text>
        </View>
      </View>

      <CategoryStrip
        value={null}
        onChange={(next) => router.push(`/rent/category/${next}` as never)}
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
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 6,
  },
  eyebrowDot: { color: colors.brand.trendyPink },
  title: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  subtitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  subtitle: { fontSize: 13 },
});
