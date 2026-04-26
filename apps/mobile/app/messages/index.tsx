import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { colors, spacing, typography } from "@trendywheels/ui-tokens";
import { useRouter } from "expo-router";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { api } from "../../lib/api";

interface Conversation {
  id: string;
  lastMessageAt: string;
  participants: Array<{ userId: string; user?: { name?: string; phone?: string } }>;
  messages: Array<{ message: string; readAt?: string | null }>;
}

export default function MessagesScreen(): JSX.Element {
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => api.getConversations(),
  });

  const conversations = (data?.data ?? []) as Conversation[];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.text.light} />
        </Pressable>
        <Text style={styles.title}>Messages</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.accent.DEFAULT} style={{ marginTop: 40 }} size="large" />
      ) : conversations.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="chatbubbles-outline" size={64} color={colors.text.secondary} />
          <Text style={styles.emptyText}>No conversations yet</Text>
        </View>
      ) : (
        <FlatList<Conversation>
          data={conversations}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={({ item, index }) => {
            const lastMsg = item.messages[0];
            const unread = lastMsg && !lastMsg.readAt;
            const otherParticipant = item.participants[0];
            const name =
              otherParticipant?.user?.name ??
              otherParticipant?.user?.phone ??
              "Unknown";
            return (
              <Animated.View entering={FadeInDown.delay(index * 40).springify()}>
                <Pressable
                  style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.dark.border }]}
                  onPress={() => router.push(`/messages/${item.id}`)}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{name[0].toUpperCase()}</Text>
                  </View>
                  <View style={styles.rowContent}>
                    <View style={styles.rowHeader}>
                      <Text style={[styles.name, unread && styles.nameUnread]}>{name}</Text>
                      <Text style={styles.time}>
                        {new Date(item.lastMessageAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <Text style={[styles.preview, unread && styles.previewUnread]} numberOfLines={1}>
                      {lastMsg?.message ?? "No messages yet"}
                    </Text>
                  </View>
                  {unread && <View style={styles.unreadDot} />}
                </Pressable>
              </Animated.View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 56,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    color: colors.text.light,
    fontSize: typography.fontSize.h3,
    fontWeight: typography.fontWeight.bold,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
    gap: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${colors.primary[700]}33`,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: colors.text.light, fontSize: 18, fontWeight: "700" },
  rowContent: { flex: 1 },
  rowHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { color: colors.text.light, fontSize: 15 },
  nameUnread: { fontWeight: "700" },
  time: { color: colors.text.secondary, fontSize: 11 },
  preview: { color: colors.text.secondary, fontSize: 13, marginTop: 2 },
  previewUnread: { color: colors.text.light },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent.DEFAULT },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", gap: spacing.md },
  emptyText: { color: colors.text.secondary, fontSize: 16 },
});
