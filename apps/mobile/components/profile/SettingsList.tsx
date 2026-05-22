// Settings group — 6 rows that link to /profile/* and /account/* screens. Each
// row is 56px tall with a 16px label, so it reads naturally with the rest of
// the redesigned profile feed (no tiny fonts, no auto-shrinking).
//
// The rows + sign-out + delete are wrapped in a single bordered card so the
// group reads as one block. Last row has no divider.

import { Ionicons } from "@expo/vector-icons";
import { colors } from "@trendywheels/ui-tokens";
import { useRouter } from "expo-router";
import * as React from "react";
import { Alert, Text, View } from "react-native";

import { useTheme } from "../../lib/use-theme";
import { TWPressable } from "../ui";

interface Row {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  route?: string;
  external?: () => void;
  destructive?: boolean;
}

interface Props {
  appVersion: string;
  onSignOut: () => void;
  onDeleteAccount: () => void;
}

export function SettingsList({ appVersion, onSignOut, onDeleteAccount }: Props): React.JSX.Element {
  const router = useRouter();
  const { palette } = useTheme();

  const rows: Row[] = [
    { icon: "create-outline", label: "Edit profile", route: "/profile/edit" },
    {
      icon: "notifications-outline",
      label: "Notifications",
      route: "/profile/notifications",
    },
    { icon: "language-outline", label: "Language", route: "/profile/settings" },
    { icon: "lock-closed-outline", label: "Privacy", route: "/privacy" },
    {
      icon: "help-circle-outline",
      label: "Help & support",
      external: () => router.push("/messages"),
    },
  ];

  return (
    <View
      style={{
        marginHorizontal: 16,
        marginTop: 16,
        backgroundColor: palette.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: palette.border,
        overflow: "hidden",
      }}
    >
      {rows.map((r, i) => (
        <TWPressable
          key={r.label}
          onPress={() => {
            if (r.route) router.push(r.route as never);
            else r.external?.();
          }}
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 16,
            paddingHorizontal: 16,
            borderBottomWidth: i < rows.length - 1 ? 1 : 0,
            borderBottomColor: palette.border,
          }}
        >
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              backgroundColor: `${colors.brand.friendlyBlue}18`,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
            }}
          >
            <Ionicons name={r.icon} size={18} color={colors.brand.friendlyBlue} />
          </View>
          <Text
            style={{
              flex: 1,
              color: palette.text,
              fontSize: 16,
              fontWeight: "600",
            }}
          >
            {r.label}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={palette.muted} />
        </TWPressable>
      ))}

      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderTopWidth: 1,
          borderTopColor: palette.border,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <Text style={{ color: palette.muted, fontSize: 12, flex: 1 }}>
          TrendyWheels v{appVersion}
        </Text>
        <TWPressable
          onPress={() =>
            Alert.alert(
              "Delete account?",
              "This permanently removes your data. You will receive a confirmation message before deletion.",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: onDeleteAccount },
              ],
            )
          }
        >
          <Text
            style={{
              color: colors.brand.ultraRed ?? "#D43F3F",
              fontSize: 12,
              fontWeight: "700",
            }}
          >
            Delete account
          </Text>
        </TWPressable>
      </View>

      <TWPressable
        onPress={onSignOut}
        style={{
          paddingVertical: 14,
          alignItems: "center",
          borderTopWidth: 1,
          borderTopColor: palette.border,
        }}
      >
        <Text
          style={{
            color: colors.brand.trendyPink,
            fontSize: 15,
            fontWeight: "700",
            letterSpacing: 0.4,
            textTransform: "uppercase",
          }}
        >
          Sign out
        </Text>
      </TWPressable>
    </View>
  );
}
