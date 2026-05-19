import { colors, spacing, twPalette } from "@trendywheels/ui-tokens";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { CategoryStrip } from "../../components/CategoryStrip";

const palette = twPalette(false);

export default function RentScreen(): JSX.Element {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>
          TRENDY<Text style={styles.eyebrowDot}>.</Text>WHEELS
        </Text>
        <Text style={styles.title}>Find your ride</Text>
        <View style={styles.subtitleRow}>
          <Ionicons name="hand-left-outline" size={14} color={palette.muted} />
          <Text style={styles.subtitle}>Pick a category to see vehicles</Text>
        </View>
      </View>

      <CategoryStrip
        value={null}
        onChange={(next) => router.push(`/rent/category/${next}` as never)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg },
  header: {
    paddingTop: 60,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: palette.card,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: palette.muted,
    letterSpacing: 2,
    marginBottom: 6,
  },
  eyebrowDot: { color: colors.brand.trendyPink },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: palette.text,
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  subtitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  subtitle: { color: palette.muted, fontSize: 13 },
});
