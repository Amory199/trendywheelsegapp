import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import type { SalesListing } from "@trendywheels/types";
import { borderRadius, colors, spacing } from "@trendywheels/ui-tokens";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { api } from "../../lib/api";

const { width: W } = Dimensions.get("window");

export default function SellDetailScreen(): JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [activeImg, setActiveImg] = useState(0);
  const carouselRef = useRef<ScrollView>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["sales-listing", id],
    queryFn: () => api.getSalesListing(id!),
    enabled: !!id,
  });

  const listing = data?.data as SalesListing | undefined;

  const onCarouselScroll = (e: NativeSyntheticEvent<NativeScrollEvent>): void => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / W);
    setActiveImg(idx);
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent.DEFAULT} />
      </View>
    );
  }

  if (!listing) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.text.secondary} />
        <Text style={styles.emptyText}>Listing not found</Text>
      </View>
    );
  }

  const images = listing.images?.length
    ? listing.images
    : ["https://placehold.co/800x600/2B0FF8/FFFFFF?text=No+Photo"];

  const STATUS_COLOR: Record<string, string> = {
    active: colors.success,
    sold: colors.error,
    pending: colors.warning,
  };

  return (
    <View style={styles.container}>
      {/* Floating back button */}
      <Pressable style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={24} color={colors.text.light} />
      </Pressable>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Image carousel */}
        <View>
          <ScrollView
            ref={carouselRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onCarouselScroll}
          >
            {images.map((uri, i) => (
              <Image
                key={i}
                source={{ uri }}
                style={styles.carouselImg}
                contentFit="cover"
                transition={200}
              />
            ))}
          </ScrollView>

          {/* Dot indicators */}
          {images.length > 1 && (
            <View style={styles.dots}>
              {images.map((_, i) => (
                <View key={i} style={[styles.dot, i === activeImg && styles.dotActive]} />
              ))}
            </View>
          )}

          {/* Counter badge */}
          <View style={styles.counter}>
            <Text style={styles.counterText}>
              {activeImg + 1} / {images.length}
            </Text>
          </View>
        </View>

        {/* Title, price, status */}
        <Animated.View entering={FadeInDown.springify()} style={styles.section}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={3}>
              {listing.title}
            </Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: `${STATUS_COLOR[listing.status] ?? colors.text.secondary}22` },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: STATUS_COLOR[listing.status] ?? colors.text.secondary },
                ]}
              >
                {listing.status.toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={styles.price}>
            {Number(listing.price).toLocaleString()} EGP
          </Text>
        </Animated.View>

        {/* Specs grid */}
        <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.specsGrid}>
            <SpecCell icon="calendar-outline" label="Year" value={String(listing.year)} />
            <SpecCell
              icon="speedometer-outline"
              label="Mileage"
              value={`${Number(listing.mileage).toLocaleString()} km`}
            />
            <SpecCell icon="cog-outline" label="Transmission" value={listing.transmission} />
            <SpecCell icon="flame-outline" label="Fuel" value={listing.fuelType} />
            <SpecCell icon="color-palette-outline" label="Color" value={listing.color} />
            <SpecCell
              icon="eye-outline"
              label="Views"
              value={String(listing.viewsCount ?? 0)}
            />
          </View>
        </Animated.View>

        {/* Description */}
        {listing.description ? (
          <Animated.View entering={FadeInDown.delay(140).springify()} style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{listing.description}</Text>
          </Animated.View>
        ) : null}

        {/* Activity stats */}
        <Animated.View entering={FadeInDown.delay(180).springify()} style={styles.statsCard}>
          <StatItem value={String(listing.viewsCount ?? 0)} label="Views" />
          <View style={styles.statDivider} />
          <StatItem value={String(listing.inquiriesCount ?? 0)} label="Inquiries" />
          <View style={styles.statDivider} />
          <StatItem
            value={new Date(listing.createdAt).toLocaleDateString("en-EG", {
              day: "numeric",
              month: "short",
            })}
            label="Listed"
          />
        </Animated.View>
      </ScrollView>

      {/* Contact bar */}
      <View style={styles.bottomBar}>
        <Pressable
          style={styles.waBtn}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            void Linking.openURL(
              `https://wa.me/?text=${encodeURIComponent(`Hi, I'm interested in your ${listing.title}`)}`,
            );
          }}
        >
          <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
          <Text style={styles.waBtnText}>WhatsApp</Text>
        </Pressable>

        <Pressable
          style={styles.msgBtn}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push("/messages");
          }}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={18} color="#000" />
          <Text style={styles.msgBtnText}>Message Seller</Text>
        </Pressable>
      </View>
    </View>
  );
}

function SpecCell({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: string;
}): JSX.Element {
  return (
    <View style={styles.specCell}>
      <Ionicons name={icon} size={18} color={colors.primary[400]} />
      <Text style={styles.specLabel}>{label}</Text>
      <Text style={styles.specValue}>{value}</Text>
    </View>
  );
}

function StatItem({ value, label }: { value: string; label: string }): JSX.Element {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  center: {
    flex: 1,
    backgroundColor: colors.dark.bg,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md,
  },
  emptyText: { color: colors.text.secondary, fontSize: 15 },

  backBtn: {
    position: "absolute",
    top: 52,
    left: spacing.md,
    zIndex: 20,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 20,
    padding: 8,
  },

  carouselImg: { width: W, height: W * 0.65 },
  dots: {
    position: "absolute",
    bottom: spacing.sm,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.35)" },
  dotActive: { width: 18, backgroundColor: colors.accent.DEFAULT },
  counter: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.md,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  counterText: { color: "#fff", fontSize: 11 },

  section: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    color: colors.text.light,
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 28,
  },
  statusBadge: {
    borderRadius: borderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  statusText: { fontSize: 10, fontWeight: "700" },
  price: {
    color: colors.accent.DEFAULT,
    fontSize: 28,
    fontWeight: "700",
    marginTop: spacing.sm,
  },

  sectionTitle: {
    color: colors.text.light,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: spacing.md,
  },
  specsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  specCell: {
    flex: 1,
    minWidth: "28%",
    backgroundColor: colors.dark.card,
    borderRadius: 10,
    padding: spacing.sm,
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  specLabel: {
    color: colors.text.secondary,
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  specValue: {
    color: colors.text.light,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
    textAlign: "center",
  },

  description: { color: colors.text.secondary, fontSize: 14, lineHeight: 22 },

  statsCard: {
    flexDirection: "row",
    margin: spacing.lg,
    backgroundColor: colors.dark.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: spacing.md,
  },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { color: colors.text.light, fontSize: 15, fontWeight: "700" },
  statLabel: { color: colors.text.secondary, fontSize: 11, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: colors.dark.border, marginVertical: 4 },

  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
    paddingBottom: 28,
    backgroundColor: colors.dark.bg,
    borderTopWidth: 1,
    borderTopColor: colors.dark.border,
  },
  waBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.dark.card,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "#25D36644",
  },
  waBtnText: { color: "#25D366", fontWeight: "700" },
  msgBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.accent.DEFAULT,
    borderRadius: 12,
    padding: spacing.md,
  },
  msgBtnText: { color: "#000", fontWeight: "700", fontSize: 15 },
});
