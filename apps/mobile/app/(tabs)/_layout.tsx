import { Ionicons } from "@expo/vector-icons";
import { colors, twPalette, layout } from "@trendywheels/ui-tokens";
import { Tabs } from "expo-router";

export default function TabLayout(): JSX.Element {
  const palette = twPalette(false);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: layout.bottomTabHeight + 14,
          backgroundColor: palette.card,
          borderTopColor: palette.border,
          borderTopWidth: 1,
          paddingBottom: 12,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.brand.friendlyBlue,
        tabBarInactiveTintColor: palette.tabInactive,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="rent"
        options={{
          title: "Rent",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "car" : "car-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="sell"
        options={{
          title: "Sell",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "pricetag" : "pricetag-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="repair"
        options={{
          title: "Repair",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "construct" : "construct-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
