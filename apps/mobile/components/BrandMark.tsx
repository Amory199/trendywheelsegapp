import * as React from "react";
import { Text, View } from "react-native";
import SvgRaw, {
  Circle as CircleRaw,
  Defs as DefsRaw,
  LinearGradient as LinearGradientRaw,
  Path as PathRaw,
  Stop as StopRaw,
} from "react-native-svg";

// Brand mark for the mobile app — mirrors @trendywheels/ui-brand/native (which
// isn't a mobile dependency) so the cold-start intro shows the SAME lockup as
// the admin web finale: SVG monogram + Anton wordmark. react-native-svg is a
// direct dep; no workspace/lockfile change needed.
const Svg = SvgRaw as unknown as React.FC<React.ComponentProps<typeof SvgRaw>>;
const Defs = DefsRaw as unknown as React.FC<React.ComponentProps<typeof DefsRaw>>;
const LinearGradient = LinearGradientRaw as unknown as React.FC<
  React.ComponentProps<typeof LinearGradientRaw>
>;
const Stop = StopRaw as unknown as React.FC<React.ComponentProps<typeof StopRaw>>;
const Path = PathRaw as unknown as React.FC<React.ComponentProps<typeof PathRaw>>;
const Circle = CircleRaw as unknown as React.FC<React.ComponentProps<typeof CircleRaw>>;

const FRIENDLY_BLUE = "#2B0FF8";
const TRENDY_PINK = "#FF0065";

let idCounter = 0;
const nextId = (): string => `twm-${++idCounter}`;

export function TWMonogram({ size = 40 }: { size?: number }): React.JSX.Element {
  const gid = React.useMemo(() => nextId(), []);
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <LinearGradient id={`${gid}-fade`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={FRIENDLY_BLUE} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
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
      <Path d="M10 16 h20 v12 h-12 a8 8 0 0 1 -8 -8 z" fill={`url(#${gid}-solid)`} opacity="0.92" />
      <Path d="M34 16 h20 a0 0 0 0 1 0 0 v4 a8 8 0 0 1 -8 8 h-12 z" fill={`url(#${gid}-fade)`} />
      <Circle cx="50" cy="50" r="4" fill={TRENDY_PINK} />
    </Svg>
  );
}

/** Monogram + "Trendy.Wheels" wordmark, as on the admin web login. */
export function TWLogoLockup({
  size = 56,
  color = "#FFFFFF",
}: {
  size?: number;
  color?: string;
}): React.JSX.Element {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: size * 0.28 }}>
      <TWMonogram size={size} />
      <Text
        style={{
          fontFamily: "Anton",
          fontSize: size * 0.62,
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
