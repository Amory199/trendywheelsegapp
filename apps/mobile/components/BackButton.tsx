import { Ionicons } from "@expo/vector-icons";
import { colors } from "@trendywheels/ui-tokens";
import { router } from "expo-router";
import { Pressable, StyleSheet, type ViewStyle } from "react-native";

// A consistent, visible way back for pushed (drill-in) screens. iOS has no
// hardware back button and the stack's edge-swipe is invisible, so every screen
// a customer can navigate INTO needs an explicit back control or they feel
// trapped. Falls back to the home tabs when there's nothing to pop (e.g. the
// screen was opened from a deep link or a push notification), so it can never
// strand the user on a dead end.
export function BackButton({
  style,
  color = colors.text.light,
  fallback = "/(tabs)",
}: {
  style?: ViewStyle;
  color?: string;
  fallback?: string;
}): JSX.Element {
  return (
    <Pressable
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Back"
      onPress={() => {
        if (router.canGoBack()) router.back();
        else router.replace(fallback as never);
      }}
      style={[styles.btn, style]}
    >
      <Ionicons name="chevron-back" size={24} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
  },
});
