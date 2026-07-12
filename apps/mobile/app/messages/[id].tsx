import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Message } from "@trendywheels/types";
import { colors, spacing } from "@trendywheels/ui-tokens";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

import { GuestGate } from "../../components/GuestGate";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-store";
import { useT } from "../../lib/locale";

export default function ChatScreen(): JSX.Element {
  // peerId = the other participant's userId, passed in when the chat is opened.
  // Essential for a BRAND-NEW conversation: with no messages yet we can't
  // derive the recipient from the thread, so without this the send no-ops.
  const { id, peerId } = useLocalSearchParams<{ id: string; peerId?: string }>();
  const router = useRouter();
  const t = useT();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const listRef = useRef<FlatList>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["messages", id],
    queryFn: () => api.getMessages(id!),
    refetchInterval: 5000,
    // Gate on the signed-in user too — a guest deep-linking a thread (tapped
    // push / shared link) hits GuestGate below, but without this the 5s poll
    // still fires an authenticated 401 every 5 seconds behind the wall.
    enabled: !!id && !!user,
  });

  // Thread metadata: context label ("About: Jeep · TW-829301") + participants,
  // so the header names what this chat is about instead of a generic "Chat".
  const convQ = useQuery({
    queryKey: ["messages", "conv", id],
    queryFn: () =>
      api.request<{
        data: {
          contextType?: string | null;
          contextTitle?: string | null;
          participants?: Array<{ user?: { id: string; name?: string | null } }>;
        };
      }>("GET", `/api/messages/conversations/${id}`),
    enabled: !!id && !!user,
    staleTime: 60000,
  });
  const conv = convQ.data?.data;
  const peerName = conv?.participants?.find((p) => p.user && p.user.id !== user?.id)?.user?.name;

  const messages = (data?.data ?? []) as Message[];

  const mutation = useMutation({
    mutationFn: (msg: string) => {
      // Prefer the peer from an existing message; fall back to the peerId the
      // opener passed (covers the empty-thread case where the old code sent to
      // an empty recipient and silently failed).
      const other = messages.find((m) => m.senderId !== user?.id);
      const recipientId =
        other?.senderId ??
        peerId ??
        conv?.participants?.find((p) => p.user && p.user.id !== user?.id)?.user?.id ??
        "";
      if (!recipientId) throw new Error(t("messages.noRecipient"));
      // Pin the message to THIS thread — context threads must not fall back
      // to the recipient's default support conversation.
      return api.sendMessage(recipientId, msg, undefined, id);
    },
    onSuccess: () => {
      setText("");
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      void qc.invalidateQueries({ queryKey: ["messages", id] });
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    },
    onError: (err) =>
      Alert.alert(
        t("messages.sendFailedTitle"),
        err instanceof Error ? err.message : t("common.tryAgain"),
      ),
  });

  const send = (): void => {
    const trimmed = text.trim();
    if (!trimmed) return;
    mutation.mutate(trimmed);
  };

  if (!user) return <GuestGate />;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.text.light} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {peerName || t("messages.chatTitle")}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Pinned context card — what this thread is ABOUT. */}
      {conv?.contextTitle ? (
        <View style={styles.contextCard}>
          <Ionicons
            name={
              conv.contextType === "repair"
                ? "construct-outline"
                : conv.contextType === "listing"
                  ? "pricetag-outline"
                  : "car-sport-outline"
            }
            size={16}
            color={colors.accent.DEFAULT}
          />
          <Text style={styles.contextLabel}>{t("messages.aboutLabel")}</Text>
          <Text style={styles.contextTitle} numberOfLines={1}>
            {conv.contextTitle}
          </Text>
        </View>
      ) : null}

      {isLoading ? (
        <ActivityIndicator color={colors.accent.DEFAULT} style={{ flex: 1 }} />
      ) : (
        <FlatList<Message>
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{
            padding: spacing.md,
            gap: spacing.sm,
            paddingBottom: spacing.lg,
          }}
          onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item, index }) => {
            const isMe = item.senderId === user?.id;
            return (
              <Animated.View
                entering={FadeInUp.delay(index * 20).springify()}
                style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}
              >
                <Text
                  style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextThem]}
                >
                  {item.message}
                </Text>
                <Text
                  style={[styles.bubbleTime, isMe ? styles.bubbleTimeMe : styles.bubbleTimeThem]}
                >
                  {new Date(item.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {isMe && item.readAt && " ✓✓"}
                </Text>
              </Animated.View>
            );
          }}
        />
      )}

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={t("messages.inputPlaceholder")}
          placeholderTextColor={colors.text.secondary}
          multiline
          maxLength={2000}
          returnKeyType="send"
          onSubmitEditing={send}
        />
        <Pressable
          style={[styles.sendBtn, (!text.trim() || mutation.isPending) && styles.sendBtnDisabled]}
          disabled={!text.trim() || mutation.isPending}
          onPress={send}
        >
          {mutation.isPending ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Ionicons name="send" size={18} color="#000" />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
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
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  headerTitle: {
    color: colors.text.light,
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 8,
  },
  contextCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  contextLabel: { color: colors.text.secondary, fontSize: 11, fontWeight: "800" },
  contextTitle: { color: colors.text.light, fontSize: 13, fontWeight: "600", flex: 1 },
  bubble: {
    maxWidth: "75%",
    borderRadius: 16,
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  bubbleMe: {
    alignSelf: "flex-end",
    backgroundColor: colors.primary[700],
    borderBottomRightRadius: 4,
  },
  bubbleThem: {
    alignSelf: "flex-start",
    backgroundColor: colors.dark.card,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  bubbleTextMe: { color: "#fff" },
  bubbleTextThem: { color: colors.text.light },
  bubbleTime: { fontSize: 10, marginTop: 4 },
  bubbleTimeMe: { color: "rgba(255,255,255,0.6)", textAlign: "right" },
  bubbleTimeThem: { color: colors.text.secondary },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.dark.border,
    backgroundColor: colors.dark.bg,
  },
  input: {
    flex: 1,
    backgroundColor: colors.dark.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.dark.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text.light,
    fontSize: 15,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent.DEFAULT,
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnDisabled: { opacity: 0.4 },
});
