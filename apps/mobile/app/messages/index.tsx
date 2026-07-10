// Customer message inbox — every thread they're part of, newest first.
// Context threads (about a booking/reservation/repair) show their pinned
// label; plain support threads fall back to the generic title.
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { colors, spacing } from "@trendywheels/ui-tokens";
import { useRouter } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { BackButton } from "../../components/BackButton";
import { GuestGate } from "../../components/GuestGate";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-store";
import { useT } from "../../lib/locale";

interface ConversationRow {
  id: string;
  lastMessageAt: string;
  contextType?: string | null;
  contextTitle?: string | null;
  messages?: Array<{ message?: string; senderId?: string; readAt?: string | null }>;
}

export default function MessagesInbox(): JSX.Element {
  const router = useRouter();
  const t = useT();
  const user = useAuth((s) => s.user);

  const q = useQuery({
    queryKey: ["conversations"],
    queryFn: () => api.request<{ data: ConversationRow[] }>("GET", "/api/messages/conversations"),
    enabled: !!user,
    refetchInterval: 15000,
  });

  if (!user) return <GuestGate />;
  const rows = q.data?.data ?? [];

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <BackButton fallback="/(tabs)/profile" />
        <Text style={styles.title}>{t("profile.activity.messagesTitle")}</Text>
      </View>
      <FlatList
        data={rows}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm, paddingBottom: 60 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="chatbubbles-outline" size={48} color={colors.text.secondary} />
            <Text style={styles.emptyText}>{t("messages.inboxEmpty")}</Text>
          </View>
        }
        renderItem={({ item }) => {
          const last = item.messages?.[0];
          const unread = !!last && last.senderId !== user.id && !last.readAt;
          return (
            <Pressable
              style={styles.card}
              onPress={() => router.push(`/messages/${item.id}` as never)}
            >
              <Ionicons
                name={
                  item.contextType === "repair"
                    ? "construct-outline"
                    : item.contextType
                      ? "car-sport-outline"
                      : "chatbubble-outline"
                }
                size={20}
                color={unread ? colors.accent.DEFAULT : colors.text.secondary}
              />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.contextTitle || t("messages.chatTitle")}
                </Text>
                <Text
                  style={[styles.cardPreview, unread && styles.cardPreviewUnread]}
                  numberOfLines={1}
                >
                  {last?.message ?? t("messages.inboxNoMessages")}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end", gap: 4 }}>
                <Text style={styles.cardTime}>
                  {new Date(item.lastMessageAt).toLocaleDateString()}
                </Text>
                {unread ? <View style={styles.unreadDot} /> : null}
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.dark.bg },
  header: { paddingTop: 60, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, gap: 6 },
  title: { color: colors.text.light, fontSize: 26, fontWeight: "800" },
  empty: { alignItems: "center", paddingVertical: 80, gap: 12 },
  emptyText: { color: colors.text.secondary, fontSize: 14 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.dark.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: spacing.md,
  },
  cardTitle: { color: colors.text.light, fontSize: 14, fontWeight: "700" },
  cardPreview: { color: colors.text.secondary, fontSize: 12 },
  cardPreviewUnread: { color: colors.text.light, fontWeight: "600" },
  cardTime: { color: colors.text.secondary, fontSize: 10 },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.brand.trendyPink,
  },
});
