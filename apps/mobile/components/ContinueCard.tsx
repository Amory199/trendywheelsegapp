import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { isRTL } from "@trendywheels/i18n";
import type { Vehicle } from "@trendywheels/types";
import { categoryColorOf, colors } from "@trendywheels/ui-tokens";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { api } from "../lib/api";
import { useAuth } from "../lib/auth-store";
import { useLocale, useT } from "../lib/locale";
import { useDisplay } from "../lib/typography";
import { useTheme } from "../lib/use-theme";
import { useRequireAuth } from "../lib/use-require-auth";
import { vehicleImageUrl } from "../lib/vehicle";

// INK stays only as an opaque shadow color; all visible text/surfaces now read
// from the theme palette so the card is legible in dark mode too.
const INK = "#02011F";

// The single item the card surfaces, off whichever auth-only, user-scoped
// source resolved first (a COMPLETED purchase → saved favorite).
interface ContinueItem {
  titleKey: "home.continueOrderTitle" | "home.continueFavoriteTitle";
  ctaKey: "home.continueCtaExplore" | "home.continueCtaView";
  ctaIcon: keyof typeof Ionicons.glyphMap;
  title: string;
  priceLabel: string;
  image?: string;
  route: string;
  /** Brand category outline color (favorite branch only — orders have none). */
  outlineColor?: string | null;
}

// Minimal shapes we read off the loosely-typed (`unknown[]`) order payload.
// The orders endpoint serializes { id, totalEgp, items: [{ product }] }.
type OrderItemProduct = { name?: unknown; images?: unknown };
type OrderRow = {
  id?: unknown;
  status?: unknown;
  items?: Array<{ product?: OrderItemProduct } | undefined> | unknown;
};

function firstString(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    const first = value[0];
    return typeof first === "string" ? first : undefined;
  }
  return undefined;
}

/**
 * Personalization slot on the home feed: resurfaces the user's single most
 * relevant item (a completed purchase → else a saved favorite vehicle) as a
 * tappable discovery card ("you bought this before — explore more").
 *
 * Guest-safe by construction (Apple 5.1.1(v)): every query is `enabled: !!user`
 * so NO auth request fires for a signed-out user, and the component returns
 * null when there's no user (or nothing to continue). The page's only sign-in
 * nudge lives elsewhere — a personalization slot's correct guest state is
 * silent absence, never a wall or a load-time redirect. The CTA still routes
 * through useRequireAuth() so a stale/expired token bounces to login on press
 * instead of throwing.
 */
export function ContinueCard(): JSX.Element | null {
  const user = useAuth((s) => s.user);
  const t = useT();
  const display = useDisplay();
  const router = useRouter();
  const requireAuth = useRequireAuth();
  const { palette } = useTheme();
  const rtl = isRTL(useLocale((s) => s.locale));

  const ordersQ = useQuery({
    queryKey: ["my-orders"],
    queryFn: () => api.getMyOrders().catch(() => ({ data: [] as unknown[] })),
    enabled: !!user,
  });
  const favoritesQ = useQuery({
    queryKey: ["favorites"],
    queryFn: () => api.getFavorites().catch(() => ({ data: [] })),
    enabled: !!user,
  });

  // Silent absence for guests — and no auth query ever fires for them.
  if (!user) return null;

  const item = resolveItem();
  if (!item) return null;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: palette.text }]}>{t(item.titleKey)}</Text>
      <Pressable
        onPress={() => requireAuth(() => router.push(item.route as never))}
        android_ripple={{ color: "rgba(43,15,248,0.10)", borderless: false }}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: palette.card, borderWidth: 1, borderColor: palette.hairline },
          // Favorite vehicles carry their brand category outline (duo
          // categories use the first color on this secondary surface).
          item.outlineColor ? { borderWidth: 2, borderColor: item.outlineColor } : null,
          pressed && { transform: [{ scale: 0.98 }] },
        ]}
      >
        <View style={styles.thumb}>
          {item.image ? (
            <Image
              source={item.image}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={250}
              cachePolicy="memory-disk"
              recyclingKey={item.image}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.thumbPlaceholder]}>
              <Ionicons name="car-sport" size={24} color="rgba(2,1,31,0.18)" />
            </View>
          )}
        </View>

        <View style={styles.middle}>
          <Text numberOfLines={1} style={[styles.title, { color: palette.text }]}>
            {item.title}
          </Text>
          <Text numberOfLines={1} style={[styles.price, display(0.3)]}>
            {item.priceLabel}
          </Text>
        </View>

        <View style={styles.cta}>
          <Text numberOfLines={1} style={styles.ctaText}>
            {t(item.ctaKey)}
          </Text>
          <Ionicons name={item.ctaIcon} size={15} color="#fff" />
        </View>
      </Pressable>
    </View>
  );

  // Resolution order: first COMPLETED purchase → first FAVORITE vehicle. Each
  // branch is fully optional-chained so a partial payload never throws.
  function resolveItem(): ContinueItem | null {
    const orders = (ordersQ.data?.data ?? []) as OrderRow[];
    // Discovery nudge off a COMPLETED order only (not pending/any): "you bought
    // this before — explore more". The CTA goes to the catalog to surface OTHER
    // carts, not a reorder of the same item.
    const boughtOrder = orders.find((o) => o?.status === "completed");
    if (boughtOrder) {
      const items = Array.isArray(boughtOrder.items) ? boughtOrder.items : [];
      const product = (items[0] as { product?: OrderItemProduct } | undefined)?.product;
      const name = typeof product?.name === "string" ? product.name : t("home.continueOrderTitle");
      return {
        titleKey: "home.continueOrderTitle",
        ctaKey: "home.continueCtaExplore",
        ctaIcon: rtl ? "arrow-back" : "arrow-forward",
        title: name,
        priceLabel: t("home.continueExploreSub"),
        image: firstString(product?.images),
        route: "/(tabs)/buy",
      };
    }

    const favorite = favoritesQ.data?.data?.[0];
    const vehicle = favorite?.vehicle as Vehicle | undefined;
    if (vehicle) {
      // Sale-only carts have a null dailyRate — Number(null) is 0, which is
      // finite, so without the branch they'd render as "EGP 0/day" and route
      // to the rent screen they can't be booked on.
      const saleOnly = vehicle.listingType === "sale" || vehicle.dailyRate == null;
      const rate = Number(vehicle.dailyRate);
      const sale = Number(vehicle.salePrice);
      const priceLabel = saleOnly
        ? Number.isFinite(sale) && sale > 0
          ? `${t("home.egp")} ${sale.toLocaleString()}`
          : ""
        : Number.isFinite(rate) && rate > 0
          ? `${t("home.egp")} ${rate.toLocaleString()}${t("home.perDay")}`
          : "";
      return {
        titleKey: "home.continueFavoriteTitle",
        ctaKey: "home.continueCtaView",
        ctaIcon: rtl ? "arrow-back" : "arrow-forward",
        title: vehicle.name,
        priceLabel,
        image: vehicleImageUrl(vehicle.images?.[0]),
        route: saleOnly ? `/sale/${vehicle.id}` : `/rent/${vehicle.id}`,
        outlineColor: categoryColorOf(vehicle.category)?.[0] ?? null,
      };
    }

    return null;
  }
}

const styles = StyleSheet.create({
  wrap: { marginTop: 22, marginHorizontal: 16 },
  label: { fontSize: 13, fontWeight: "800", color: INK, marginBottom: 10 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 12,
    shadowColor: INK,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#EAEAF0",
  },
  thumbPlaceholder: { alignItems: "center", justifyContent: "center" },
  middle: { flex: 1, minWidth: 0 },
  title: { fontSize: 14, fontWeight: "700", color: INK },
  price: { fontSize: 16, color: INK, marginTop: 2 },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.brand.friendlyBlue,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
  },
  ctaText: { color: "#fff", fontSize: 12, fontWeight: "800" },
});
