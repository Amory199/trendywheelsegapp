import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { api } from "../../lib/api";

interface Conversation {
  id: string;
  lastMessageAt: string;
  participants: Array<{ userId: string; user?: { name?: string; phone?: string } }>;
  messages: Array<{ message: string; readAt?: string | null; senderId: string }>;
}

export default function SupportChat(): JSX.Element {
  const router = useRouter();

  const convQ = useQuery({
    queryKey: ["support", "conversations"],
    queryFn: async (): Promise<Conversation[]> => {
      const r = await api.getConversations();
      return (r.data ?? []) as Conversation[];
    },
  });

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Live chat</Text>
      </View>

      {convQ.isLoading ? (
        <ActivityIndicator color={colors.brand.poolBlue} style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={convQ.data ?? []}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ padding: 14, paddingBottom: 120, gap: 8 }}
          refreshControl={
            <RefreshControl
              refreshing={convQ.isFetching}
              onRefresh={() => convQ.refetch()}
              tintColor={colors.text.light}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={48} color={colors.text.secondary} />
              <Text style={styles.emptyText}>No active conversations</Text>
            </View>
          }
          renderItem={({ item }) => {
            const last = item.messages[0];
            const other = item.participants[0];
            const name = other?.user?.name ?? other?.user?.phone ?? "Customer";
            return (
              <Pressable style={styles.row} onPress={() => router.push(`/messages/${item.id}`)}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{name.slice(0, 1).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.name} numberOfLines={1}>
                    {name}
                  </Text>
                  <Text style={styles.preview} numberOfLines={1}>
                    {last?.message ?? "No messages"}
                  </Text>
                </View>
                <Text style={styles.time}>{new Date(item.lastMessageAt).toLocaleDateString()}</Text>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.dark.bg },
  header: { paddingTop: 56, paddingHorizontal: 18, paddingBottom: 10 },
  title: { color: colors.text.light, fontSize: 24, fontWeight: "700" },
  empty: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyText: { color: colors.text.secondary, fontSize: 13 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.dark.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.brand.poolBlue + "33",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.text.light, fontWeight: "700" },
  name: { color: colors.text.light, fontSize: 14, fontWeight: "700" },
  preview: { color: colors.text.secondary, fontSize: 12 },
  time: { color: colors.text.secondary, fontSize: 10 },
});
