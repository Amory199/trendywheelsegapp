import { Ionicons } from "@expo/vector-icons";
import * as React from "react";
import { Text, View, type StyleProp, type ViewStyle } from "react-native";

import { useT } from "../lib/locale";
import { useTheme } from "../lib/use-theme";
import { TWButton } from "./ui";

// Full-screen friendly failure state. Shown by data screens (and QueryBoundary)
// whenever a fetch fails — so a customer on bad signal or during an API blip
// sees "Sorry, something went wrong — try again" with a working retry button
// instead of a blank screen or a spinner that never resolves.
export function ErrorState({
  title,
  message,
  onRetry,
  icon = "cloud-offline-outline",
  style,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
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
          gap: 14,
          backgroundColor: p.bg,
        },
        style,
      ]}
    >
      <Ionicons name={icon} size={56} color={p.muted} />
      <Text style={{ fontSize: 18, fontWeight: "800", color: p.text, textAlign: "center" }}>
        {title ?? t("common.error")}
      </Text>
      <Text
        style={{ fontSize: 14, color: p.muted, textAlign: "center", lineHeight: 20, maxWidth: 280 }}
      >
        {message ?? t("common.errorBody")}
      </Text>
      {onRetry ? (
        <TWButton kind="pink" icon="refresh" onPress={onRetry} style={{ marginTop: 6 }}>
          {t("common.tryAgain")}
        </TWButton>
      ) : null}
    </View>
  );
}
