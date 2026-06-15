import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { colors, spacing } from "@trendywheels/ui-tokens";
import { Stack, useRouter } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { GuestGate } from "../../components/GuestGate";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-store";
import { useT } from "../../lib/locale";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export default function NotificationsScreen(): JSX.Element {
  const router = useRouter();
  const t = useT();
  const qc = useQueryClient();
  const user = useAuth((s) => s.user);
  const query = useQuery({
    queryKey: ["notifications"],
    queryFn: async (): Promise<NotificationItem[]> => {
      const res = await api.getNotifications();
      return (res.data ?? []) as unknown as NotificationItem[];
    },
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => api.markNotificationRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAll = useMutation({
    mutationFn: async () => api.markAllNotificationsRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  if (!user) return <GuestGate />;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t("profile.notifications.title"),
          headerStyle: { backgroundColor: colors.dark.bg },
          headerTintColor: colors.text.light,
          headerRight: () => (
            <Pressable
              onPress={() => markAll.mutate()}
              hitSlop={12}
              style={{ paddingHorizontal: 8 }}
            >
              <Text style={{ color: colors.brand.friendlyBlue, fontWeight: "700", fontSize: 13 }}>
                {t("profile.notifications.markAll")}
              </Text>
            </Pressable>
          ),
        }}
      />
      <View style={styles.container}>
        {query.isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.brand.friendlyBlue} />
          </View>
        ) : (query.data ?? []).length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="notifications-outline" size={64} color={colors.text.secondary} />
            <Text style={styles.emptyText}>{t("profile.notifications.empty")}</Text>
          </View>
        ) : (
          <FlatList
            data={query.data}
            keyExtractor={(n) => n.id}
            contentContainerStyle={{ padding: spacing.md, gap: 10 }}
            refreshControl={
              <RefreshControl
                refreshing={query.isFetching}
                onRefresh={() => query.refetch()}
                tintColor={colors.text.light}
              />
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  if (!item.readAt) markRead.mutate(item.id);
                }}
                style={[styles.row, !item.readAt && styles.rowUnread]}
              >
                <View style={styles.iconWrap}>
                  <Ionicons
                    name={iconForType(item.type)}
                    size={20}
                    color={colors.brand.friendlyBlue}
                  />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.title} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.body} numberOfLines={2}>
                    {item.body}
                  </Text>
                </View>
                {!item.readAt && <View style={styles.unreadDot} />}
              </Pressable>
            )}
          />
        )}
      </View>
    </>
  );
}

function iconForType(type: string): React.ComponentProps<typeof Ionicons>["name"] {
  if (type.startsWith("booking")) return "calendar";
  if (type.startsWith("listing") || type.startsWith("sale")) return "pricetag";
  if (type.startsWith("repair")) return "construct";
  if (type.startsWith("lead")) return "person-add";
  return "notifications";
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyText: { color: colors.text.secondary, fontSize: 14 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.dark.card,
    borderRadius: 12,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  rowUnread: {
    borderColor: colors.brand.friendlyBlue + "55",
    backgroundColor: colors.brand.friendlyBlue + "0F",
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.brand.friendlyBlue + "22",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: colors.text.light, fontSize: 14, fontWeight: "700" },
  body: { color: colors.text.secondary, fontSize: 12, lineHeight: 16 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brand.trendyPink,
  },
});
