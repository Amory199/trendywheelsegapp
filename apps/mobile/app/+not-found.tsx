import { colors, spacing, typography } from "@trendywheels/ui-tokens";
import { Link } from "expo-router";
import { View, Text, StyleSheet } from "react-native";

export default function NotFoundScreen(): JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Page Not Found</Text>
      <Link href="/" style={styles.link}>
        Go Home
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.bg,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: typography.fontSize.h2,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.light,
    marginBottom: spacing.md,
  },
  link: { fontSize: typography.fontSize.bodyLarge, color: colors.primary[500] },
});
