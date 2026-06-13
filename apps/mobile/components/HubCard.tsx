// Large tappable gradient-overlaid image card. Used on the sell hub to mirror
// the customer web's /sell page — three big cards stacked vertically, each
// routing to one of: sell outright / list for rent / trade in.

import { colors } from "@trendywheels/ui-tokens";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useT } from "../lib/locale";

interface HubCardProps {
  imageUri: string;
  label: string;
  sub: string;
  onPress: () => void;
}

export function HubCard({ imageUri, label, sub, onPress }: HubCardProps): JSX.Element {
  const t = useT();
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
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.sub}>{sub}</Text>
        <Text style={styles.start}>{t("home.start")}</Text>
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
    fontFamily: "Anton",
    fontSize: 32,
    color: "#fff",
    letterSpacing: 0.3,
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
    letterSpacing: 1.5,
    color: colors.brand.ecoLimelight,
  },
});
