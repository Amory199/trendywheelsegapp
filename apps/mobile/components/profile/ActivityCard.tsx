// Full-width tappable card for "My Bookings / My Listings / My Repairs /
// Messages". Replaces the 47%-width ActivityTile whose tiny font was the TRACK
// AR regression. Layout: 56×56 tone-tinted icon box, title (18px) + subtitle
// (count or latest row, 13px muted) flex middle, chevron right.

import { Ionicons } from "@expo/vector-icons";
import { colors } from "@trendywheels/ui-tokens";
import { Image } from "expo-image";
import * as React from "react";
import { Text, View } from "react-native";

import { useTracking } from "../../lib/typography";
import { useTheme } from "../../lib/use-theme";
import { TWPressable } from "../ui";

type Tone = "blue" | "pink" | "amber" | "pool" | "purple";

const TONE_MAP: Record<Tone, string> = {
  blue: colors.brand.friendlyBlue,
  pink: colors.brand.trendyPink,
  amber: "#F5B800",
  pool: colors.brand.poolBlue,
  purple: "#7A4DFF",
};

interface Props {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  subtitle: string;
  tone: Tone;
  badge?: string;
  onPress: () => void;
  /** Optional branded PNG icon (require(...)). When set it replaces the Ionicon
   *  and the tile switches to a neutral box so the full-color icon reads cleanly. */
  image?: number;
}

export function ActivityCard({
  icon,
  title,
  subtitle,
  tone,
  badge,
  onPress,
  image,
}: Props): React.JSX.Element {
  const { palette, isDark } = useTheme();
  const track = useTracking();
  const accent = TONE_MAP[tone];
  return (
    <TWPressable
      onPress={onPress}
      style={{
        marginHorizontal: 16,
        marginTop: 10,
        backgroundColor: palette.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: palette.border,
        paddingVertical: 14,
        paddingHorizontal: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
      }}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          backgroundColor: image
            ? isDark
              ? "rgba(255,255,255,0.08)"
              : "rgba(43,15,248,0.07)"
            : `${accent}22`,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {image ? (
          <Image source={image} style={{ width: 36, height: 34 }} contentFit="contain" />
        ) : (
          <Ionicons name={icon} size={26} color={accent} />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text
            style={{
              color: palette.text,
              fontSize: 18,
              fontWeight: "700",
              letterSpacing: track(0.2),
            }}
            numberOfLines={1}
          >
            {title}
          </Text>
          {badge ? (
            <View
              style={{
                backgroundColor: accent,
                borderRadius: 999,
                paddingHorizontal: 8,
                paddingVertical: 2,
              }}
            >
              <Text
                style={{
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: "800",
                  letterSpacing: track(0.4),
                }}
              >
                {badge}
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={{ color: palette.muted, fontSize: 13, marginTop: 2 }} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={palette.muted} />
    </TWPressable>
  );
}
