import { Ionicons } from "@expo/vector-icons";
import { colors } from "@trendywheels/ui-tokens";
import { Image } from "expo-image";
import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

const INK = "#02011F";
const MUTED = "rgba(2,1,31,0.55)";

export interface ListingCardProps {
  title: string;
  priceLabel: string;
  onPress: () => void;
  image?: string | null;
  /**
   * averageRating; a star chip renders only when > 0. Accepts string too —
   * the API serializes it as a Prisma Decimal string, so we coerce internally.
   */
  rating?: number | string | null;
  location?: string | null;
  badge?: string | null;
  badgeColor?: string;
  /** Dim + overlay (e.g. out of stock / sold). */
  overlayLabel?: string | null;
  /** Card width. Defaults to a rail-sized 156. */
  width?: number;
  /** Image aspect = width * this. Defaults 0.78 (slightly landscape). */
  imageRatio?: number;
}

/**
 * Shared product/vehicle card used in home rails, search results, and the
 * catalog grids. Purely presentational — the caller maps its data type
 * (Vehicle / Product / SalesListing) onto these props, so the card stays
 * decoupled from any one shape.
 */
function ListingCardImpl({
  title,
  priceLabel,
  onPress,
  image,
  rating,
  location,
  badge,
  badgeColor = colors.brand.friendlyBlue,
  overlayLabel,
  width = 156,
  imageRatio = 0.78,
}: ListingCardProps): JSX.Element {
  const imgH = Math.round(width * imageRatio);
  const ratingNum = Number(rating) || 0;
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: "rgba(43,15,248,0.10)", borderless: false }}
      style={({ pressed }) => [{ width }, pressed && { transform: [{ scale: 0.97 }] }]}
    >
      <View style={[styles.imageWrap, { width, height: imgH }]}>
        {image ? (
          <Image
            source={image}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={250}
            cachePolicy="memory-disk"
            recyclingKey={image}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.imagePlaceholder]}>
            <Ionicons name="car-sport" size={28} color="rgba(2,1,31,0.18)" />
          </View>
        )}

        {badge ? (
          <View style={[styles.badge, { backgroundColor: badgeColor }]}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}

        {ratingNum > 0 ? (
          <View style={styles.ratingPill}>
            <Ionicons name="star" size={11} color="#FFB400" />
            <Text style={styles.ratingText}>{ratingNum.toFixed(1)}</Text>
          </View>
        ) : null}

        {overlayLabel ? (
          <View style={styles.overlay}>
            <Text style={styles.overlayText}>{overlayLabel}</Text>
          </View>
        ) : null}
      </View>

      <Text numberOfLines={1} style={styles.title}>
        {title}
      </Text>

      {location ? (
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={11} color={MUTED} />
          <Text numberOfLines={1} style={styles.location}>
            {location}
          </Text>
        </View>
      ) : null}

      <Text numberOfLines={1} style={styles.price}>
        {priceLabel}
      </Text>
    </Pressable>
  );
}

export const ListingCard = memo(ListingCardImpl);

const styles = StyleSheet.create({
  imageWrap: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#EAEAF0",
  },
  imagePlaceholder: { alignItems: "center", justifyContent: "center" },
  badge: {
    position: "absolute",
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "800", letterSpacing: 0.4 },
  ratingPill: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  ratingText: { color: INK, fontSize: 10, fontWeight: "800" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2,1,31,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  overlayText: { color: "#fff", fontWeight: "700", letterSpacing: 1.5, fontSize: 11 },
  title: { marginTop: 8, fontSize: 13, fontWeight: "700", color: INK },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 },
  location: { fontSize: 11, color: MUTED, flexShrink: 1 },
  price: {
    fontFamily: "Anton",
    fontSize: 17,
    color: colors.brand.trendyPink,
    marginTop: 2,
    letterSpacing: 0.3,
  },
});
