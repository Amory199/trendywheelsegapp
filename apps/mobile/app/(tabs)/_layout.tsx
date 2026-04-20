import { colors, layout } from "@trendywheels/ui-tokens";
import { Tabs } from "expo-router";
import { View, StyleSheet } from "react-native";

export default function TabLayout(): JSX.Element {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.accent.DEFAULT,
        tabBarInactiveTintColor: colors.text.secondary,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="rent"
        options={{
          title: "Rent",
          tabBarIcon: ({ color }) => <TabIcon color={color} label="R" />,
        }}
      />
      <Tabs.Screen
        name="sell"
        options={{
          title: "Sell",
          tabBarIcon: ({ color }) => <TabIcon color={color} label="S" />,
        }}
      />
      <Tabs.Screen
        name="repair"
        options={{
          title: "Repair",
          tabBarIcon: ({ color }) => <TabIcon color={color} label="W" />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <TabIcon color={color} label="P" />,
        }}
      />
    </Tabs>
  );
}

function TabIcon({ color, label: _label }: { color: string; label: string }): JSX.Element {
  return (
    <View style={[styles.iconContainer, { borderColor: color }]}>
      <View>
        {/* TODO: Replace with proper icons */}
        <View style={[styles.iconPlaceholder, { backgroundColor: color }]}>
          <View />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: layout.bottomTabHeight,
    backgroundColor: colors.dark.bg,
    borderTopColor: colors.dark.border,
    borderTopWidth: 1,
    paddingBottom: 4,
    paddingTop: 4,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  iconContainer: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  iconPlaceholder: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },
});
