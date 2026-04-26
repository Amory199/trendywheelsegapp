import * as React from "react";
import { View, Text } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";

// TrendyWheels brand primitives — React Native version for the mobile app.
// Same shapes and proportions as the web version; consumed via `react-native-svg`.

const FRIENDLY_BLUE = "#2B0FF8";
const TRENDY_PINK = "#FF0065";

let idCounter = 0;
const nextId = () => `tw-${++idCounter}`;

export function TWMonogram({
  size = 40,
  fadeTo = "#FFFFFF",
}: {
  size?: number;
  fadeTo?: string;
}): React.JSX.Element {
  const gid = React.useMemo(() => nextId(), []);
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <LinearGradient id={`${gid}-fade`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={FRIENDLY_BLUE} />
          <Stop offset="1" stopColor={fadeTo} stopOpacity="0" />
        </LinearGradient>
        <LinearGradient id={`${gid}-solid`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={FRIENDLY_BLUE} />
          <Stop offset="1" stopColor={FRIENDLY_BLUE} stopOpacity="0.82" />
        </LinearGradient>
      </Defs>
      <Path
        d="M26 8 h12 a4 4 0 0 1 4 4 v40 a4 4 0 0 1 -4 4 h-12 a4 4 0 0 1 -4 -4 v-40 a4 4 0 0 1 4 -4 z"
        fill={`url(#${gid}-solid)`}
      />
      <Path
        d="M10 16 h20 v12 h-12 a8 8 0 0 1 -8 -8 z"
        fill={`url(#${gid}-solid)`}
        opacity="0.92"
      />
      <Path
        d="M34 16 h20 a0 0 0 0 1 0 0 v4 a8 8 0 0 1 -8 8 h-12 z"
        fill={`url(#${gid}-fade)`}
      />
      <Circle cx="50" cy="50" r="4" fill={TRENDY_PINK} />
    </Svg>
  );
}

const FONT_DISPLAY = "Anton";
const FONT_BODY = "Source Sans 3";

export function TWWordmark({
  size = 22,
  color = FRIENDLY_BLUE,
  stacked = false,
}: {
  size?: number;
  color?: string;
  stacked?: boolean;
}): React.JSX.Element {
  if (stacked) {
    return (
      <View style={{ alignItems: "flex-start" }}>
        <Text
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: size,
            letterSpacing: size * 0.02,
            textTransform: "uppercase",
            color,
            lineHeight: size * 0.92,
          }}
        >
          TRENDY<Text style={{ color: TRENDY_PINK }}>.</Text>
        </Text>
        <Text
          style={{
            fontFamily: FONT_BODY,
            fontWeight: "300",
            fontSize: size * 0.42,
            letterSpacing: size * 0.32 * 0.1,
            textTransform: "uppercase",
            opacity: 0.7,
            marginTop: size * 0.08,
            color,
          }}
        >
          Wheels
        </Text>
      </View>
    );
  }
  return (
    <View style={{ flexDirection: "row", alignItems: "baseline" }}>
      <Text
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: size,
          letterSpacing: size * 0.01,
          textTransform: "uppercase",
          color,
        }}
      >
        Trendy<Text style={{ color: TRENDY_PINK }}>.</Text>Wheels
      </Text>
    </View>
  );
}

export function TWLogoLockup({
  size = 40,
  color = FRIENDLY_BLUE,
}: {
  size?: number;
  color?: string;
}): React.JSX.Element {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: size * 0.28,
      }}
    >
      <TWMonogram size={size} />
      <TWWordmark size={size * 0.62} color={color} />
    </View>
  );
}
