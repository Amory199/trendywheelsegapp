import { Ionicons } from "@expo/vector-icons";
import { BottomTabBar, type BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { colors, layout } from "@trendywheels/ui-tokens";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { Platform, StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";

import { useT } from "../../lib/locale";
import { TabBarScrollProvider, useTabBarTranslate } from "../../lib/tab-bar-scroll";
import { useTheme } from "../../lib/use-theme";

// Glassy bottom tab bar. Translucent BlurView background with theme-aware
// scrim + hairline brand-tinted top border. Tint swaps based on light/dark.
function GlassTabBar({ isDark }: { isDark: boolean }): JSX.Element {
  return (
    <View style={StyleSheet.absoluteFill}>
      <BlurView
        intensity={Platform.OS === "ios" ? 60 : 90}
        tint={isDark ? "dark" : "light"}
        style={StyleSheet.absoluteFill}
      />
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: isDark ? "rgba(2,1,31,0.45)" : "rgba(255,255,255,0.55)" },
        ]}
      />
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          backgroundColor: "rgba(43,15,248,0.35)",
        }}
      />
    </View>
  );
}

// Wraps the standard BottomTabBar in an Animated.View driven by the shared
// translateY value from TabBarScrollProvider. Scroll-down hides; scroll-up
// shows. Keeps the BlurView background + Tabs's icon/label rendering intact.
function AutoHidingTabBar(props: BottomTabBarProps): JSX.Element {
  const translateY = useTabBarTranslate();
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  return (
    <Animated.View style={[{ position: "absolute", left: 0, right: 0, bottom: 0 }, animatedStyle]}>
      <BottomTabBar {...props} />
    </Animated.View>
  );
}

export default function TabLayout(): JSX.Element {
  const { palette, isDark } = useTheme();
  const t = useT();

  return (
    <TabBarScrollProvider>
      <Tabs
        tabBar={(props) => <AutoHidingTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          tabBarBackground: () => <GlassTabBar isDark={isDark} />,
          tabBarStyle: {
            height: layout.bottomTabHeight + 14,
            backgroundColor: "transparent",
            borderTopWidth: 0,
            paddingBottom: 12,
            paddingTop: 8,
            position: "absolute",
            elevation: 0,
          },
          tabBarActiveTintColor: colors.brand.friendlyBlue,
          tabBarInactiveTintColor: palette.tabInactive,
          tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t("tabs.home"),
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="buy"
          options={{
            title: t("tabs.buy"),
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "bag" : "bag-outline"} size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="rent"
          options={{
            title: t("tabs.rent"),
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "car" : "car-outline"} size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="sell"
          options={{
            title: t("tabs.sell"),
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "pricetag" : "pricetag-outline"} size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="repair"
          options={{
            title: t("tabs.repair"),
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "construct" : "construct-outline"}
                size={24}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: t("tabs.profile"),
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "person" : "person-outline"} size={24} color={color} />
            ),
          }}
        />
      </Tabs>
    </TabBarScrollProvider>
  );
}
