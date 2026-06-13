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
          backgroundColor: "rgba(255,0,101,0.35)",
        }}
      />
    </View>
  );
}

export default function CrmLayout(): JSX.Element {
  const t = useT();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
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
        tabBarActiveTintColor: colors.brand.trendyPink,
        tabBarInactiveTintColor: "rgba(255,255,255,0.55)",
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
      }}
    >
      <Tabs.Screen
        name="pipeline"
        options={{
          title: t("crm.tabs.pipeline"),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "git-network" : "git-network-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: t("crm.tabs.inventory"),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "car-sport" : "car-sport-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="repairs/index"
        options={{
          title: t("crm.tabs.repairs"),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "construct" : "construct-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tickets/index"
        options={{
          title: t("crm.tabs.support"),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "headset" : "headset-outline"} size={22} color={color} />
          ),
        }}
      />
      {/* Team management is an admin capability (the /api/crm/team endpoint is
          admin-only) and lives in the admin console under Sales Team. Hidden
          here so regular staff get a clean 4-tab work hub instead of a tab
          that 403s for them. */}
      <Tabs.Screen name="team" options={{ href: null }} />
      <Tabs.Screen name="leads/[id]" options={{ href: null }} />
      <Tabs.Screen name="leads/new" options={{ href: null }} />
      <Tabs.Screen name="repairs/[id]" options={{ href: null }} />
      <Tabs.Screen name="tickets/[id]" options={{ href: null }} />
    </Tabs>
  );
}
