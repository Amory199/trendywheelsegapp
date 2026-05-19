import { colors } from "@trendywheels/ui-tokens";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import * as React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";

import { useAuth } from "../../lib/auth-store";
import { useTabBarScrollHandler } from "../../lib/tab-bar-scroll";

const HERO_VIDEO = require("../../assets/hero/home.mp4");

const CHIPS = [
  { href: "/(tabs)/buy" as const, label: "Buy", sub: "Carts · Parts" },
  { href: "/(tabs)/rent" as const, label: "Rent", sub: "By the day" },
  { href: "/(tabs)/sell" as const, label: "Sell", sub: "Sell · Trade in" },
  { href: "/(tabs)/repair" as const, label: "Service", sub: "Repair · Trip" },
] as const;

export default function HomeScreen(): React.JSX.Element {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const scrollHandler = useTabBarScrollHandler();

  const player = useVideoPlayer(HERO_VIDEO, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  const firstName = user?.name?.split(" ")[0];

  return (
    <View style={{ flex: 1, backgroundColor: "#F7F7FB" }}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        {/* HERO */}
        <View
          style={{
            height: 540,
            position: "relative",
            backgroundColor: "#02011F",
            overflow: "hidden",
          }}
        >
          <View style={StyleSheet.absoluteFill}>
            <VideoView
              player={player}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              nativeControls={false}
              pointerEvents="none"
            />
          </View>
          <LinearGradient
            colors={["rgba(2,1,31,0.15)", "rgba(2,1,31,0.55)", "rgba(2,1,31,0.92)"]}
            style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
          />
          <View style={{ position: "absolute", left: 24, right: 24, bottom: 36 }}>
            <Animated.Text
              entering={FadeIn.duration(400)}
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.85)",
                letterSpacing: 2.4,
                fontWeight: "700",
                marginBottom: 10,
              }}
            >
              {firstName ? `HEY, ${firstName.toUpperCase()}` : "CRUISE BOLD"}
            </Animated.Text>
            <Animated.Text
              entering={FadeInDown.duration(450).delay(100)}
              style={{
                fontFamily: "Anton",
                fontSize: 56,
                color: "#fff",
                lineHeight: 56,
                letterSpacing: 0.4,
              }}
            >
              What do you{"\n"}
              <Text style={{ color: colors.brand.trendyPink }}>need today?</Text>
            </Animated.Text>
          </View>
        </View>

        {/* CHIPS */}
        <View style={{ padding: 16, gap: 12 }}>
          {CHIPS.map((c, i) => (
            <Animated.View key={c.href} entering={FadeInDown.duration(350).delay(150 + i * 80)}>
              <Pressable
                onPress={() => router.push(c.href as never)}
                android_ripple={{ color: "rgba(43,15,248,0.10)", borderless: false }}
                style={({ pressed }) => ({
                  backgroundColor: "#fff",
                  borderRadius: 18,
                  padding: 22,
                  borderWidth: 1,
                  borderColor: "rgba(2,1,31,0.06)",
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                  shadowColor: "#02011F",
                  shadowOpacity: 0.06,
                  shadowOffset: { width: 0, height: 6 },
                  shadowRadius: 18,
                })}
              >
                <Text
                  style={{
                    fontFamily: "Anton",
                    fontSize: 32,
                    color: "#02011F",
                    letterSpacing: 0.4,
                  }}
                >
                  {c.label}
                </Text>
                <Text style={{ fontSize: 13, color: "rgba(2,1,31,0.55)", marginTop: 4 }}>
                  {c.sub}
                </Text>
              </Pressable>
            </Animated.View>
          ))}
        </View>
        <View style={{ height: 110 }} />
      </Animated.ScrollView>
    </View>
  );
}
