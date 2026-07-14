import { BottomTabBar, type BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { colors, layout } from "@trendywheels/ui-tokens";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { Tabs } from "expo-router";
import { Platform, StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";

import { useT } from "../../lib/locale";
import { TabBarScrollProvider, useTabBarTranslate } from "../../lib/tab-bar-scroll";
import { useTheme } from "../../lib/use-theme";

// Custom brand tab icons (blue→purple 3D set). Full-color, so they can't be
// tinted like the old Ionicons — active/inactive is conveyed by opacity instead,
// and the label keeps its active-blue / inactive-muted tint from screenOptions.
const TAB_ICONS = {
  home: require("../../assets/tabs/home.png"),
  buy: require("../../assets/tabs/buy.png"),
  rent: require("../../assets/tabs/rent.png"),
  sell: require("../../assets/tabs/sell.png"),
  service: require("../../assets/tabs/service.png"),
  profile: require("../../assets/tabs/profile.png"),
} as const;

function TabIcon({
  name,
  focused,
}: {
  name: keyof typeof TAB_ICONS;
  focused: boolean;
}): JSX.Element {
  return (
    <Image
      source={TAB_ICONS[name]}
      style={[styles.tabIcon, { opacity: focused ? 1 : 0.5 }]}
      contentFit="contain"
    />
  );
}

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

const styles = StyleSheet.create({
  tabIcon: { width: 32, height: 30 },
});

export default function TabLayout(): JSX.Element {
  const { palette, isDark } = useTheme();
  const t = useT();

  return (
    <TabBarScrollProvider>
      <Tabs
        tabBar={(props) => <AutoHidingTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          // Paint the scene bg so a loading tab never flashes white.
          sceneStyle: { backgroundColor: palette.bg },
          // Soft crossfade between tabs instead of a hard cut.
          animation: "fade",
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
            tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="buy"
          options={{
            title: t("tabs.buy"),
            tabBarIcon: ({ focused }) => <TabIcon name="buy" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="rent"
          options={{
            title: t("tabs.rent"),
            tabBarIcon: ({ focused }) => <TabIcon name="rent" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="sell"
          options={{
            title: t("tabs.sell"),
            tabBarIcon: ({ focused }) => <TabIcon name="sell" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="repair"
          options={{
            title: t("tabs.repair"),
            tabBarIcon: ({ focused }) => <TabIcon name="service" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: t("tabs.profile"),
            tabBarIcon: ({ focused }) => <TabIcon name="profile" focused={focused} />,
          }}
        />
      </Tabs>
    </TabBarScrollProvider>
  );
}
