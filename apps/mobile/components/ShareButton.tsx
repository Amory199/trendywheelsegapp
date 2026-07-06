import { Ionicons } from "@expo/vector-icons";
import type * as React from "react";
import { Share, StyleSheet } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

import { logEvent } from "../lib/analytics";
import { TWPressable } from "./ui";

// Public web/deep-link host. Once the native universal/app-link config ships,
// this same URL opens the listing IN the app for people who have it installed,
// and falls back to the store/web listing for everyone else.
const LINK_HOST = "https://app.trendywheelseg.com";

type ShareKind = "rent" | "sale" | "buy";

// Round share affordance for listing detail screens. Shares a canonical link to
// the listing; recipients without the app land on the web listing (→ store),
// recipients with it deep-link straight to the in-app screen.
export function ShareButton({
  kind,
  id,
  title,
  style,
  iconColor = "#02011F",
  size = 22,
}: {
  kind: ShareKind;
  id: string;
  title?: string | null;
  style?: StyleProp<ViewStyle>;
  iconColor?: string;
  size?: number;
}): React.JSX.Element {
  const url = `${LINK_HOST}/${kind}/${id}`;
  const onShare = async (): Promise<void> => {
    try {
      const name = title?.trim();
      await Share.share({
        message: name ? `${name}\n${url}` : url,
        url, // iOS uses this as the rich link; Android ignores it
      });
      logEvent("listing_shared", { kind, id });
    } catch {
      // User dismissed the sheet or share failed — nothing to recover.
    }
  };

  return (
    <TWPressable onPress={() => void onShare()} style={style ?? styles.fallback}>
      <Ionicons name="share-outline" size={size} color={iconColor} />
    </TWPressable>
  );
}

const styles = StyleSheet.create({
  fallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
});
