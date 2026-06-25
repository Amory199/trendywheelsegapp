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

import { useT } from "../../lib/locale";
import { useTracking } from "../../lib/typography";
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
  const t = useT();
  const track = useTracking();

  const rows: Row[] = [
    {
      icon: "create-outline",
      label: t("profile.settingsList.editProfile"),
      route: "/profile/edit",
    },
    {
      icon: "notifications-outline",
      label: t("profile.settingsList.notifications"),
      route: "/profile/notifications",
    },
    {
      icon: "language-outline",
      label: t("profile.settingsList.language"),
      route: "/profile/settings",
    },
    { icon: "lock-closed-outline", label: t("profile.settingsList.privacy"), route: "/privacy" },
    {
      icon: "help-circle-outline",
      label: t("profile.settingsList.helpSupport"),
      route: "/support/tickets",
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
              t("profile.settingsList.deleteTitle"),
              t("profile.settingsList.deleteMessage"),
              [
                { text: t("common.cancel"), style: "cancel" },
                { text: t("common.delete"), style: "destructive", onPress: onDeleteAccount },
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
            {t("profile.settingsList.deleteAccount")}
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
            letterSpacing: track(0.4),
            textTransform: "uppercase",
          }}
        >
          {t("profile.settingsList.signOut")}
        </Text>
      </TWPressable>
    </View>
  );
}
