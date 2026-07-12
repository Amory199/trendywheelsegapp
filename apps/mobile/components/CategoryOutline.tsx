import { LinearGradient } from "expo-linear-gradient";
import { type ReactNode } from "react";
import { type StyleProp, View, type ViewStyle } from "react-native";

// Outline thickness — matches the 2px pink active rings used across the
// category UI, so category and selected outlines never shift layout.
const BORDER = 2;

interface Props {
  /** One color → plain 2px border. Two → diagonal gradient ring (RN borders
   *  can't render gradients, so padding on the gradient acts as the border). */
  colors: [string] | [string, string];
  /** Outer corner radius. The duo variant clips its content at radius - 2 so
   *  the ring reads as a uniform 2px border with concentric corners. */
  radius: number;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

/**
 * Category-colored outline wrapper. Both variants occupy exactly the same
 * layout box as a plain 2px border (RN borders are border-box; the gradient
 * path swaps borderWidth for padding), so single ↔ duo never resizes the
 * child.
 */
export function CategoryOutline({ colors, radius, style, children }: Props): JSX.Element {
  if (colors.length === 1) {
    return (
      <View
        style={[
          { borderWidth: BORDER, borderColor: colors[0], borderRadius: radius, overflow: "hidden" },
          style,
        ]}
      >
        {children}
      </View>
    );
  }
  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[{ padding: BORDER, borderRadius: radius, overflow: "hidden" }, style]}
    >
      {/* 100% resolves against the padded content box when the caller sizes
          the outline, and falls back to content size otherwise. */}
      <View
        style={{
          width: "100%",
          height: "100%",
          borderRadius: radius - BORDER,
          overflow: "hidden",
        }}
      >
        {children}
      </View>
    </LinearGradient>
  );
}
