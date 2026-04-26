import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Message } from "@trendywheels/types";
import { colors, spacing } from "@trendywheels/ui-tokens";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
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

import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-store";

export default function ChatScreen(): JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const listRef = useRef<FlatList>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["messages", id],
    queryFn: () => api.getMessages(id!),
    refetchInterval: 5000,
    enabled: !!id,
  });

  const messages = (data?.data ?? []) as Message[];

  const mutation = useMutation({
    mutationFn: (msg: string) => {
      const other = messages.find((m) => m.senderId !== user?.id);
      const recipientId = other?.senderId ?? "";
      return api.sendMessage(recipientId, msg);
    },
    onSuccess: () => {
      setText("");
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      void qc.invalidateQueries({ queryKey: ["messages", id] });
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    },
  });

  const send = (): void => {
    const trimmed = text.trim();
    if (!trimmed) return;
    mutation.mutate(trimmed);
  };

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
        <Text style={styles.headerTitle}>Chat</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.accent.DEFAULT} style={{ flex: 1 }} />
      ) : (
        <FlatList<Message>
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.lg }}
          onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item, index }) => {
            const isMe = item.senderId === user?.id;
            return (
              <Animated.View
                entering={FadeInUp.delay(index * 20).springify()}
                style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}
              >
                <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextThem]}>
                  {item.message}
                </Text>
                <Text style={[styles.bubbleTime, isMe ? styles.bubbleTimeMe : styles.bubbleTimeThem]}>
                  {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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
          placeholder="Type a message…"
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
  headerTitle: { color: colors.text.light, fontSize: 16, fontWeight: "700" },
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
