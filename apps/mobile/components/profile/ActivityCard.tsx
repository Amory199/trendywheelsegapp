// Full-width tappable card for "My Bookings / My Listings / My Repairs /
// Messages". Replaces the 47%-width ActivityTile whose tiny font was the TRACK
// AR regression. Layout: 56×56 tone-tinted icon box, title (18px) + subtitle
// (count or latest row, 13px muted) flex middle, chevron right.

import { Ionicons } from "@expo/vector-icons";
import { colors } from "@trendywheels/ui-tokens";
import * as React from "react";
import { Text, View } from "react-native";

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
}

export function ActivityCard({
  icon,
  title,
  subtitle,
  tone,
  badge,
  onPress,
}: Props): React.JSX.Element {
  const { palette } = useTheme();
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
          backgroundColor: `${accent}22`,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={26} color={accent} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text
            style={{
              color: palette.text,
              fontSize: 18,
              fontWeight: "700",
              letterSpacing: 0.2,
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
                  letterSpacing: 0.4,
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
