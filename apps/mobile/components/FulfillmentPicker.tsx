import { Ionicons } from "@expo/vector-icons";
import * as React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useT } from "../lib/locale";
import { useTheme } from "../lib/use-theme";

import { DropoffLocationField } from "./DropoffLocationField";

// The fulfillment options differ by side of the deal. Buy-side (buy / reserve /
// rent) = how the customer receives the vehicle; sell-side (sell / trade-in) =
// how they hand it over. Options that involve a location show the drop-off
// field; the showroom options don't.
export type FulfillmentValue = { type: string | null; location: string };

type Option = {
  key: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  titleKey: string;
  subKey: string;
  needsLocation: boolean;
};

const BUY_OPTIONS: Option[] = [
  {
    key: "delivery_now",
    icon: "flash",
    titleKey: "fulfillment.deliverNow",
    subKey: "fulfillment.deliverNowSub",
    needsLocation: true,
  },
  {
    key: "delivery_scheduled",
    icon: "location",
    titleKey: "fulfillment.deliverScheduled",
    subKey: "fulfillment.deliverScheduledSub",
    needsLocation: true,
  },
  {
    key: "showroom_visit",
    icon: "storefront",
    titleKey: "fulfillment.showroomVisit",
    subKey: "fulfillment.showroomVisitSub",
    needsLocation: false,
  },
];

const SELL_OPTIONS: Option[] = [
  {
    key: "pickup_from_me",
    icon: "location",
    titleKey: "fulfillment.pickupFromMe",
    subKey: "fulfillment.pickupFromMeSub",
    needsLocation: true,
  },
  {
    key: "dropoff_showroom",
    icon: "storefront",
    titleKey: "fulfillment.dropoffShowroom",
    subKey: "fulfillment.dropoffShowroomSub",
    needsLocation: false,
  },
];

export function optionNeedsLocation(type: string | null): boolean {
  return type === "delivery_now" || type === "delivery_scheduled" || type === "pickup_from_me";
}

interface Props {
  side: "buy" | "sell";
  value: FulfillmentValue;
  onChange: (next: FulfillmentValue) => void;
}

export function FulfillmentPicker({ side, value, onChange }: Props): React.JSX.Element {
  const t = useT();
  const { palette } = useTheme();
  const options = side === "sell" ? SELL_OPTIONS : BUY_OPTIONS;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.heading, { color: palette.text }]}>
        {t(side === "sell" ? "fulfillment.sellHeading" : "fulfillment.heading")}
      </Text>
      {options.map((opt) => {
        const active = value.type === opt.key;
        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange({ type: opt.key, location: value.location })}
            style={[
              styles.option,
              { backgroundColor: palette.card, borderColor: active ? "#2B0FF8" : palette.border },
              active && styles.optionActive,
            ]}
          >
            <View style={[styles.iconWrap, { backgroundColor: active ? "#2B0FF8" : palette.bg }]}>
              <Ionicons name={opt.icon} size={20} color={active ? "#fff" : palette.muted} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.optTitle, { color: palette.text }]}>{t(opt.titleKey)}</Text>
              <Text style={[styles.optSub, { color: palette.muted }]}>{t(opt.subKey)}</Text>
            </View>
            <Ionicons
              name={active ? "radio-button-on" : "radio-button-off"}
              size={20}
              color={active ? "#2B0FF8" : palette.muted}
            />
          </Pressable>
        );
      })}

      {optionNeedsLocation(value.type) ? (
        <View style={{ marginTop: 6 }}>
          <DropoffLocationField
            value={value.location}
            onChange={(location) => onChange({ type: value.type, location })}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  heading: { fontSize: 15, fontWeight: "800", marginBottom: 2 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
  },
  optionActive: { backgroundColor: "rgba(43,15,248,0.04)" },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  optTitle: { fontSize: 14, fontWeight: "700" },
  optSub: { fontSize: 12, lineHeight: 16, marginTop: 1 },
});
