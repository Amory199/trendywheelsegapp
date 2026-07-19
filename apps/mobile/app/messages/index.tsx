// Message inbox. Two audiences share this screen:
//   • customers — every thread they're part of, newest first;
//   • staff — the same list, but the server auto-joins them to EVERY context
//     thread, so the rows must also name the customer the thread is about and
//     be filterable, otherwise it's a wall of identical vehicle labels.
// Context threads (about a booking/reservation/repair) show their pinned
// label; plain support threads fall back to the generic title.
import { Ionicons } from "@expo/vector-icons";
import { useQueries, useQuery } from "@tanstack/react-query";
import { colors, spacing } from "@trendywheels/ui-tokens";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

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

// The list endpoint returns bare participant rows (no joined user), so the
// customer's name has to come from the per-conversation detail call. Bounded
// because a busy staffer is a participant of every thread in the system.
const PEER_LOOKUP_LIMIT = 40;

interface ConversationDetail {
  participants?: Array<{
    user?: { id: string; name?: string | null; accountType?: string | null };
  }>;
}

type InboxFilter = "all" | "context" | "support";

export default function MessagesInbox(): JSX.Element {
  const router = useRouter();
  const t = useT();
  const user = useAuth((s) => s.user);
  const isStaff = user?.accountType === "admin" || user?.accountType === "staff";
  const [filter, setFilter] = useState<InboxFilter>("all");

  const q = useQuery({
    queryKey: ["conversations"],
    queryFn: () => api.request<{ data: ConversationRow[] }>("GET", "/api/messages/conversations"),
    enabled: !!user,
    refetchInterval: 15000,
  });

  const rows = useMemo(() => q.data?.data ?? [], [q.data]);
  const visible = useMemo(
    () =>
      rows.filter((c) => {
        if (!isStaff || filter === "all") return true;
        return filter === "context" ? !!c.contextType : !c.contextType;
      }),
    [rows, isStaff, filter],
  );

  // Same query key the chat screen uses, so a thread already opened costs
  // nothing here and vice versa.
  const peerQueries = useQueries({
    queries: (isStaff ? rows.slice(0, PEER_LOOKUP_LIMIT) : []).map((c) => ({
      queryKey: ["messages", "conv", c.id],
      queryFn: () => api.getConversation(c.id) as Promise<{ data: ConversationDetail }>,
      staleTime: 300000,
    })),
  });

  const customerNames = useMemo(() => {
    const byConversation: Record<string, string> = {};
    if (!isStaff) return byConversation;
    rows.slice(0, PEER_LOOKUP_LIMIT).forEach((c, i) => {
      const detail = peerQueries[i]?.data?.data;
      const customer = detail?.participants?.find((p) => p.user?.accountType === "customer");
      if (customer?.user?.name) byConversation[c.id] = customer.user.name;
    });
    return byConversation;
  }, [rows, peerQueries, isStaff]);

  if (!user) return <GuestGate />;

  const filters: Array<{ key: InboxFilter; label: string }> = [
    { key: "all", label: t("ops.inboxFilterAll") },
    { key: "context", label: t("ops.inboxFilterContext") },
    { key: "support", label: t("ops.inboxFilterSupport") },
  ];

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        {/* Staff never reach the customer tab bar, so send them back to CRM. */}
        <BackButton fallback={isStaff ? "/crm/pipeline" : "/(tabs)/profile"} />
        <Text style={styles.title}>
          {isStaff ? t("ops.inboxStaffTitle") : t("profile.activity.messagesTitle")}
        </Text>
      </View>
      {isStaff ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {filters.map((f) => (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[styles.chip, filter === f.key && styles.chipActive]}
            >
              <Text style={[styles.chipText, filter === f.key && styles.chipTextActive]}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
      <FlatList
        data={visible}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm, paddingBottom: 60 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="chatbubbles-outline" size={48} color={colors.text.secondary} />
            <Text style={styles.emptyText}>
              {isStaff ? t("ops.inboxEmptyStaff") : t("messages.inboxEmpty")}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const last = item.messages?.[0];
          // Message.recipientId names exactly ONE user, so readAt is only
          // meaningful for that person — never surface it to staff.
          const unread = !isStaff && !!last && last.senderId !== user.id && !last.readAt;
          const customerName = customerNames[item.id];
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
                {isStaff ? (
                  <View style={styles.customerRow}>
                    <Ionicons name="person-outline" size={11} color={colors.accent.DEFAULT} />
                    <Text style={styles.customerName} numberOfLines={1}>
                      {customerName || t("messages.unknownUser")}
                    </Text>
                  </View>
                ) : null}
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
  filterRow: { paddingHorizontal: spacing.md, gap: spacing.sm, paddingBottom: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.dark.border,
    backgroundColor: colors.dark.card,
  },
  chipActive: { borderColor: colors.accent.DEFAULT, backgroundColor: colors.accent.DEFAULT },
  chipText: { color: colors.text.secondary, fontSize: 12, fontWeight: "700" },
  chipTextActive: { color: "#000" },
  empty: { alignItems: "center", paddingVertical: 80, gap: 12 },
  emptyText: { color: colors.text.secondary, fontSize: 14, textAlign: "center" },
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
  customerRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  customerName: { color: colors.accent.DEFAULT, fontSize: 11, fontWeight: "700", flex: 1 },
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
