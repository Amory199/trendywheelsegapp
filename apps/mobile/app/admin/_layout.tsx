import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { Platform, StyleSheet, View } from "react-native";

import { useAdminLeadRealtime } from "../../lib/realtime";

// Admin workspace — bottom tabs for the role's daily-driver flows.
// Sales/support get their own layout under app/crm and app/support.

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
          backgroundColor: "rgba(43,15,248,0.35)",
        }}
      />
    </View>
  );
}

export default function AdminLayout(): JSX.Element {
  // Live-invalidate admin caches when sales agents fire CRM mutations. Drives
  // the "admin sees sales activity right away" requirement via Socket.IO.
  const qc = useQueryClient();
  useAdminLeadRealtime(qc);

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
        tabBarActiveTintColor: colors.brand.friendlyBlue,
        tabBarInactiveTintColor: "rgba(255,255,255,0.55)",
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "grid" : "grid-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: "Bookings",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "calendar" : "calendar-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: "Users",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "people" : "people-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="catalog"
        options={{
          title: "Catalog",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "apps" : "apps-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="more" options={{ href: null }} />
      <Tabs.Screen name="vehicles/index" options={{ href: null }} />
      <Tabs.Screen name="vehicles/[id]" options={{ href: null }} />
      <Tabs.Screen name="vehicles/new" options={{ href: null }} />
      <Tabs.Screen name="repairs/index" options={{ href: null }} />
      <Tabs.Screen name="repairs/[id]" options={{ href: null }} />
      <Tabs.Screen name="sales/index" options={{ href: null }} />
      <Tabs.Screen name="sales/[id]" options={{ href: null }} />
      <Tabs.Screen name="service-requests/index" options={{ href: null }} />
      <Tabs.Screen name="service-requests/[kind]/[id]" options={{ href: null }} />
      <Tabs.Screen name="system-config" options={{ href: null }} />
      <Tabs.Screen name="recent-activity" options={{ href: null }} />
      <Tabs.Screen name="users/[id]" options={{ href: null }} />
    </Tabs>
  );
}
