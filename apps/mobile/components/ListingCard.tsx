import { Ionicons } from "@expo/vector-icons";
import { categoryColorOf, colors } from "@trendywheels/ui-tokens";
import { Image } from "expo-image";
import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "../lib/use-theme";
import { useDisplay, useTracking } from "../lib/typography";

import { CategoryOutline } from "./CategoryOutline";
import { FuelBadge } from "./FuelBadge";
import { PriceGate } from "./PriceGate";

// On-card chrome that always sits over a fixed surface (white rating pill,
// image placeholder) keeps its own ink; the title/location render on the page
// background, so those follow the theme palette instead.
const INK = "#02011F";

export interface ListingCardProps {
  title: string;
  priceLabel: string;
  /** Optional original price shown struck through before the (sale) priceLabel. */
  strikePriceLabel?: string | null;
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
  /**
   * Vehicle category (golf-cart / scooter / …) → brand-colored 2px outline on
   * the image block (duo categories get the gradient ring). Unknown / absent
   * keys render the plain card unchanged.
   */
  categoryKey?: string | null;
  /** Pink fuel pill over the image for gasoline / hybrid; electric stays clean. */
  fuelType?: string | null;
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
  strikePriceLabel,
  onPress,
  image,
  rating,
  location,
  badge,
  badgeColor = colors.brand.friendlyBlue,
  overlayLabel,
  width = 156,
  imageRatio = 0.78,
  categoryKey,
  fuelType,
}: ListingCardProps): JSX.Element {
  const display = useDisplay();
  const track = useTracking();
  const { palette } = useTheme();
  const imgH = Math.round(width * imageRatio);
  const ratingNum = Number(rating) || 0;
  const outline = categoryColorOf(categoryKey);
  // Everything drawn over the image, shared by both wrappers below. The inner
  // View carries the placeholder background so the outlined variants (whose
  // wrapper is the border/gradient) still show it while the image loads.
  const imageBlock = (
    <View style={styles.imageInner}>
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
          <Text style={[styles.badgeText, { letterSpacing: track(0.4) }]}>{badge}</Text>
        </View>
      ) : null}

      {ratingNum > 0 ? (
        <View style={styles.ratingPill}>
          <Ionicons name="star" size={11} color="#FFB400" />
          <Text style={styles.ratingText}>{ratingNum.toFixed(1)}</Text>
        </View>
      ) : null}

      {/* Bottom-right — diagonally opposite the top-left badge, clear of the
          top-right rating pill. */}
      <FuelBadge fuelType={fuelType} style={styles.fuelBadge} />

      {overlayLabel ? (
        <View style={styles.overlay}>
          <Text style={[styles.overlayText, { letterSpacing: track(1.5) }]}>{overlayLabel}</Text>
        </View>
      ) : null}
    </View>
  );
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: "rgba(43,15,248,0.10)", borderless: false }}
      style={({ pressed }) => [{ width }, pressed && { transform: [{ scale: 0.97 }] }]}
    >
      {outline ? (
        // CategoryOutline occupies the exact same box as the plain wrapper
        // (border-box / padding swap), so outlined cards never resize.
        <CategoryOutline colors={outline} radius={16} style={{ width, height: imgH }}>
          {imageBlock}
        </CategoryOutline>
      ) : (
        <View style={[styles.imageWrap, { width, height: imgH }]}>{imageBlock}</View>
      )}

      <Text numberOfLines={1} style={[styles.title, { color: palette.text }]}>
        {title}
      </Text>

      {location ? (
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={11} color={palette.muted} />
          <Text numberOfLines={1} style={[styles.location, { color: palette.muted }]}>
            {location}
          </Text>
        </View>
      ) : null}

      <View style={styles.priceRow}>
        {/* Prices are gated to signed-in users. A guest sees a "sign in to see
            price" pill in place of the whole price block (struck + sale). */}
        <PriceGate>
          {/* Struck original sits ON ITS OWN LINE above the sale price. Two full
              EGP prices never fit side-by-side on a narrow card, so inlining them
              overflowed the card edge into the next one. */}
          {strikePriceLabel ? (
            <Text numberOfLines={1} style={[styles.strikePrice, { color: palette.muted }]}>
              {strikePriceLabel}
            </Text>
          ) : null}
          {/* Price in theme text (white on the dark app, dark in light mode) —
              the pink was hard to read; white reads cleanly on the card. */}
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[styles.price, display(0.3), { color: palette.text }]}
          >
            {priceLabel}
          </Text>
        </PriceGate>
      </View>
    </Pressable>
  );
}

export const ListingCard = memo(ListingCardImpl);

const styles = StyleSheet.create({
  imageWrap: {
    borderRadius: 16,
    overflow: "hidden",
  },
  imageInner: { flex: 1, backgroundColor: "#EAEAF0" },
  imagePlaceholder: { alignItems: "center", justifyContent: "center" },
  fuelBadge: { position: "absolute", bottom: 8, right: 8 },
  badge: {
    position: "absolute",
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
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
  overlayText: { color: "#fff", fontWeight: "700", fontSize: 11 },
  title: { marginTop: 8, fontSize: 13, fontWeight: "700" },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 },
  location: { fontSize: 11, flexShrink: 1 },
  priceRow: { marginTop: 3 },
  price: {
    fontSize: 17,
  },
  strikePrice: {
    fontSize: 12,
    fontWeight: "600",
    textDecorationLine: "line-through",
    marginBottom: 1,
  },
});
