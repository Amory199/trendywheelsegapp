// Large tappable gradient-overlaid image card. Used on the sell hub to mirror
// the customer web's /sell page — three big cards stacked vertically, each
// routing to one of: sell outright / list for rent / trade in.

import { colors } from "@trendywheels/ui-tokens";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useT } from "../lib/locale";
import { useDisplay, useTracking } from "../lib/typography";

interface HubCardProps {
  imageUri: string;
  label: string;
  sub: string;
  onPress: () => void;
}

export function HubCard({ imageUri, label, sub, onPress }: HubCardProps): JSX.Element {
  const t = useT();
  const display = useDisplay();
  const track = useTracking();
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <Image source={{ uri: imageUri }} style={styles.bg} contentFit="cover" />
      <LinearGradient
        colors={["rgba(2,1,31,0.9)", "rgba(2,1,31,0.45)", "rgba(2,1,31,0)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.content}>
        <Text style={[styles.label, display(0.3)]}>{label}</Text>
        <Text style={styles.sub}>{sub}</Text>
        <Text style={[styles.start, { letterSpacing: track(1.5) }]}>{t("home.start")}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    overflow: "hidden",
    minHeight: 220,
    backgroundColor: "#222",
  },
  bg: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    padding: 24,
    justifyContent: "flex-end",
    minHeight: 220,
  },
  label: {
    fontSize: 32,
    color: "#fff",
    lineHeight: 34,
  },
  sub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
    marginTop: 6,
    maxWidth: 320,
  },
  start: {
    marginTop: 14,
    fontSize: 12,
    fontWeight: "700",
    color: colors.brand.ecoLimelight,
  },
});
