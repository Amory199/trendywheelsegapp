import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SalesListing } from "@trendywheels/types";
import { borderRadius, colors, spacing } from "@trendywheels/ui-tokens";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-store";

const STATUS_COLOR: Record<string, string> = {
  active: colors.success,
  sold: colors.error,
  pending: colors.warning,
};

export default function MyListingsScreen(): JSX.Element {
  const router = useRouter();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [menuId, setMenuId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["my-listings", user?.id],
    queryFn: () => api.getSalesListings({ limit: 100 }),
    select: (res) => res.data.filter((l) => l.userId === user?.id),
    enabled: !!user?.id,
  });

  const listings = data ?? [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteSalesListing(id),
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void qc.invalidateQueries({ queryKey: ["my-listings"] });
      void qc.invalidateQueries({ queryKey: ["sales-listings"] });
      setMenuId(null);
    },
  });

  const markSoldMutation = useMutation({
    mutationFn: (id: string) => api.updateSalesListing(id, { status: "sold" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["my-listings"] });
      setMenuId(null);
    },
  });

  const confirmDelete = (id: string): void => {
    Alert.alert(
      "Delete Listing",
      "This listing will be permanently removed. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteMutation.mutate(id),
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.text.light} />
        </Pressable>
        <Text style={styles.title}>My Listings</Text>
        <Pressable
          style={styles.addBtn}
          onPress={() => router.push("/sell/create")}
        >
          <Ionicons name="add" size={20} color="#000" />
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator
          color={colors.accent.DEFAULT}
          size="large"
          style={{ marginTop: 60 }}
        />
      ) : listings.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="pricetag-outline" size={64} color={colors.text.secondary} />
          <Text style={styles.emptyTitle}>No listings yet</Text>
          <Text style={styles.emptySubtitle}>
            List your car and reach thousands of buyers
          </Text>
          <Pressable
            style={styles.emptyBtn}
            onPress={() => router.push("/sell/create")}
          >
            <Text style={styles.emptyBtnText}>List a Car</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList<SalesListing>
          data={listings}
          keyExtractor={(l) => l.id}
          contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: 40 }}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
              <Pressable
                style={({ pressed }) => [
                  styles.card,
                  pressed && { opacity: 0.9 },
                ]}
                onPress={() => router.push(`/sell/${item.id}`)}
                onLongPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setMenuId(item.id);
                }}
              >
                {/* Thumbnail */}
                <Image
                  source={{
                    uri:
                      item.images?.[0] ??
                      "https://placehold.co/400x300/2B0FF8/FFFFFF?text=No+Photo",
                  }}
                  style={styles.cardImage}
                  contentFit="cover"
                  transition={200}
                />

                {/* Info */}
                <View style={styles.cardBody}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: `${STATUS_COLOR[item.status] ?? colors.text.secondary}22`,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          { color: STATUS_COLOR[item.status] ?? colors.text.secondary },
                        ]}
                      >
                        {item.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.cardPrice}>
                    {Number(item.price).toLocaleString()} EGP
                  </Text>

                  <View style={styles.cardMeta}>
                    <Text style={styles.metaText}>
                      {item.year} · {Number(item.mileage).toLocaleString()} km
                    </Text>
                    <View style={styles.statsRow}>
                      <Ionicons name="eye-outline" size={12} color={colors.text.secondary} />
                      <Text style={styles.metaText}>{item.viewsCount ?? 0}</Text>
                      <Ionicons
                        name="chatbubble-outline"
                        size={12}
                        color={colors.text.secondary}
                      />
                      <Text style={styles.metaText}>{item.inquiriesCount ?? 0}</Text>
                    </View>
                  </View>
                </View>

                {/* Quick action button */}
                <Pressable
                  style={styles.moreBtn}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setMenuId(item.id);
                  }}
                >
                  <Ionicons
                    name="ellipsis-vertical"
                    size={20}
                    color={colors.text.secondary}
                  />
                </Pressable>
              </Pressable>
            </Animated.View>
          )}
        />
      )}

      {/* Action sheet modal */}
      <Modal
        visible={!!menuId}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuId(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setMenuId(null)}>
          <Animated.View
            entering={FadeInDown.springify()}
            style={styles.actionSheet}
          >
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Listing Actions</Text>

            <Pressable
              style={styles.sheetOption}
              onPress={() => {
                setMenuId(null);
                if (menuId) router.push(`/sell/${menuId}`);
              }}
            >
              <Ionicons name="eye-outline" size={20} color={colors.text.light} />
              <Text style={styles.sheetOptionText}>View Listing</Text>
            </Pressable>

            <Pressable
              style={styles.sheetOption}
              onPress={() => {
                if (menuId) markSoldMutation.mutate(menuId);
              }}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color={colors.success} />
              <Text style={[styles.sheetOptionText, { color: colors.success }]}>
                Mark as Sold
              </Text>
            </Pressable>

            <Pressable
              style={[styles.sheetOption, styles.sheetOptionDanger]}
              onPress={() => {
                if (menuId) confirmDelete(menuId);
              }}
            >
              {deleteMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.error} />
              ) : (
                <Ionicons name="trash-outline" size={20} color={colors.error} />
              )}
              <Text style={[styles.sheetOptionText, { color: colors.error }]}>
                Delete Listing
              </Text>
            </Pressable>

            <Pressable style={styles.sheetCancel} onPress={() => setMenuId(null)}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
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
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  title: { color: colors.text.light, fontSize: 18, fontWeight: "700" },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent.DEFAULT,
    justifyContent: "center",
    alignItems: "center",
  },

  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.xl,
  },
  emptyTitle: { color: colors.text.light, fontSize: 18, fontWeight: "700" },
  emptySubtitle: { color: colors.text.secondary, fontSize: 14, textAlign: "center" },
  emptyBtn: {
    backgroundColor: colors.accent.DEFAULT,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  emptyBtnText: { color: "#000", fontWeight: "700" },

  card: {
    flexDirection: "row",
    backgroundColor: colors.dark.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.dark.border,
    overflow: "hidden",
    alignItems: "center",
  },
  cardImage: { width: 96, height: 96 },
  cardBody: { flex: 1, padding: spacing.md, gap: 4 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  cardTitle: { flex: 1, color: colors.text.light, fontSize: 13, fontWeight: "600", lineHeight: 18 },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  statusText: { fontSize: 9, fontWeight: "700" },
  cardPrice: { color: colors.accent.DEFAULT, fontSize: 15, fontWeight: "700" },
  cardMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statsRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { color: colors.text.secondary, fontSize: 11 },
  moreBtn: { padding: spacing.md },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  actionSheet: {
    backgroundColor: colors.dark.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.dark.border,
    alignSelf: "center",
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  sheetTitle: {
    color: colors.text.secondary,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  sheetOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  sheetOptionDanger: { borderBottomWidth: 0 },
  sheetOptionText: { color: colors.text.light, fontSize: 15, fontWeight: "600" },
  sheetCancel: {
    margin: spacing.md,
    backgroundColor: colors.dark.bg,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: "center",
  },
  sheetCancelText: { color: colors.text.secondary, fontWeight: "700" },
});
