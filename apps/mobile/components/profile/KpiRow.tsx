// Three-stat horizontal strip under the hero. Each stat is a big number + a
// small label. Pure presentation — caller supplies the numbers.

import * as React from "react";
import { Text, View } from "react-native";

import { useTheme } from "../../lib/use-theme";

interface Stat {
  value: number | string;
  label: string;
}

export function KpiRow({ stats }: { stats: [Stat, Stat, Stat] }): React.JSX.Element {
  const { palette } = useTheme();
  return (
    <View
      style={{
        marginHorizontal: 16,
        marginTop: 12,
        backgroundColor: palette.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: palette.border,
        paddingVertical: 16,
        flexDirection: "row",
      }}
    >
      {stats.map((s, i) => (
        <React.Fragment key={s.label}>
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text
              style={{
                color: palette.text,
                fontFamily: "Anton",
                fontSize: 28,
                letterSpacing: 0.5,
              }}
            >
              {s.value}
            </Text>
            <Text
              style={{
                color: palette.muted,
                fontSize: 11,
                marginTop: 2,
                fontWeight: "700",
                letterSpacing: 0.4,
                textTransform: "uppercase",
              }}
            >
              {s.label}
            </Text>
          </View>
          {i < stats.length - 1 && <View style={{ width: 1, backgroundColor: palette.border }} />}
        </React.Fragment>
      ))}
    </View>
  );
}
