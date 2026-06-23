import { Ionicons } from "@expo/vector-icons";
import * as React from "react";
import { Text, View, type StyleProp, type ViewStyle } from "react-native";

import { useT } from "../lib/locale";
import { useTheme } from "../lib/use-theme";

import { TWButton } from "./ui";

// Full-screen "nothing here yet" state for a successful fetch that returned
// zero items — kept visually distinct from ErrorState so a customer can always
// tell "there's nothing" apart from "it failed, retry".
export function EmptyState({
  title,
  message,
  icon = "file-tray-outline",
  ctaLabel,
  onCta,
  style,
}: {
  title?: string;
  message?: string;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  ctaLabel?: string;
  onCta?: () => void;
  style?: StyleProp<ViewStyle>;
}): React.JSX.Element {
  const { palette: p } = useTheme();
  const t = useT();
  return (
    <View
      style={[
        {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: 32,
          gap: 12,
          backgroundColor: p.bg,
        },
        style,
      ]}
    >
      <Ionicons name={icon} size={52} color={p.muted} />
      <Text style={{ fontSize: 16, fontWeight: "700", color: p.text, textAlign: "center" }}>
        {title ?? t("common.nothingHere")}
      </Text>
      {message ? (
        <Text
          style={{
            fontSize: 14,
            color: p.muted,
            textAlign: "center",
            lineHeight: 20,
            maxWidth: 280,
          }}
        >
          {message}
        </Text>
      ) : null}
      {ctaLabel && onCta ? (
        <TWButton kind="outline" onPress={onCta} style={{ marginTop: 6 }}>
          {ctaLabel}
        </TWButton>
      ) : null}
    </View>
  );
}
