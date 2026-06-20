import { Ionicons } from "@expo/vector-icons";
import { colors } from "@trendywheels/ui-tokens";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { Platform, StyleSheet, View } from "react-native";

import { useT } from "../../lib/locale";

function GlassTabBar(): JSX.Element {
  return (
    <View style={StyleSheet.absoluteFill}>
      <BlurView
        intensity={Platform.OS === "ios" ? 60 : 90}
        tint="dark"
        style={StyleSheet.absoluteFill}
      />
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(2,1,31,0.45)" }]}
      />
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          backgroundColor: "rgba(0,199,234,0.35)",
        }}
      />
    </View>
  );
}

export default function SupportLayout(): JSX.Element {
  const t = useT();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: "fade",
        tabBarBackground: () => <GlassTabBar />,
        tabBarStyle: {
          height: 70,
          backgroundColor: "transparent",
          borderTopWidth: 0,
          paddingBottom: 12,
          paddingTop: 8,
          position: "absolute",
          elevation: 0,
        },
        tabBarActiveTintColor: colors.brand.poolBlue,
        tabBarInactiveTintColor: "rgba(255,255,255,0.55)",
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
      }}
    >
      <Tabs.Screen
        name="tickets"
        options={{
          title: t("support.tabTickets"),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "headset" : "headset-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: t("support.tabChat"),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "chatbubbles" : "chatbubbles-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen name="tickets/[id]" options={{ href: null }} />
      <Tabs.Screen name="tickets/new" options={{ href: null }} />
    </Tabs>
  );
}
