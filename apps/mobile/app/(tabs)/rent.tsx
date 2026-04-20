import { colors, spacing, typography } from "@trendywheels/ui-tokens";
import { View, Text, StyleSheet } from "react-native";

export default function RentScreen(): JSX.Element {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Browse Vehicles</Text>
      </View>
      {/* TODO: Vehicle list with FlashList, filters, search */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.bg,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: typography.fontSize.h1,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.light,
  },
});
