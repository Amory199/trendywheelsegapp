// Shared step indicator for the multi-step sell flows (trade-in, list-for-rent).
// Mirrors the visual language of the List-a-Car wizard: numbered circles that
// fill in as you advance, joined by a track that lights up behind you. Themed
// off the active palette so it reads in both light and dark mode.

import { Ionicons } from "@expo/vector-icons";
import { colors, type Palette, spacing } from "@trendywheels/ui-tokens";
import { Pressable, StyleSheet, Text, View } from "react-native";

export function StepBar({
  step,
  total,
  palette,
  // When provided, each step circle becomes tappable so the user can jump
  // freely between steps to review or edit. Omitting it keeps the indicator
  // purely presentational (backward-compatible).
  onStepPress,
}: {
  step: number;
  total: number;
  palette: Palette;
  onStepPress?: (index: number) => void;
}): React.JSX.Element {
  const styles = makeStyles(palette);
  return (
    <View style={styles.bar}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={styles.item}>
          <Pressable
            accessibilityRole="button"
            disabled={!onStepPress}
            onPress={() => onStepPress?.(i)}
            style={[styles.circle, i < step && styles.done, i === step && styles.active]}
          >
            {i < step ? (
              <Ionicons name="checkmark" size={14} color="#000" />
            ) : (
              <Text style={[styles.num, i === step && styles.numActive]}>{i + 1}</Text>
            )}
          </Pressable>
          {i < total - 1 ? <View style={[styles.line, i < step && styles.lineDone]} /> : null}
        </View>
      ))}
    </View>
  );
}

function makeStyles(palette: Palette) {
  return StyleSheet.create({
    bar: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.sm,
    },
    item: { flex: 1, flexDirection: "row", alignItems: "center" },
    circle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: palette.card,
      borderWidth: 1,
      borderColor: palette.border,
      justifyContent: "center",
      alignItems: "center",
    },
    done: { backgroundColor: colors.accent.DEFAULT, borderColor: colors.accent.DEFAULT },
    active: { borderColor: colors.accent.DEFAULT },
    num: { color: palette.muted, fontSize: 12, fontWeight: "700" },
    numActive: { color: colors.accent.DEFAULT },
    line: { flex: 1, height: 2, backgroundColor: palette.border, marginHorizontal: 4 },
    lineDone: { backgroundColor: colors.accent.DEFAULT },
  });
}
