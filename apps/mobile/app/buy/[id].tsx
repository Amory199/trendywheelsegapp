import { useQuery } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import { useState } from "react";
import { Dimensions, Pressable, ScrollView, Text, View } from "react-native";

import { ErrorState } from "../../components/ErrorState";
import { ImageCarousel } from "../../components/ImageCarousel";
import { PriceGate } from "../../components/PriceGate";
import { ShareButton } from "../../components/ShareButton";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-store";
import { useT } from "../../lib/locale";
import { useTheme } from "../../lib/use-theme";
import { useDisplay, useTracking } from "../../lib/typography";
import { useRequireAuth } from "../../lib/use-require-auth";

interface Product {
  id: string;
  category: string;
  name: string;
  description?: string | null;
  priceEgp: string | number;
  images: string[];
  inStock: boolean;
  brand?: string | null;
  model?: string | null;
  year?: number | null;
}

const W = Dimensions.get("window").width;
const HERO_H = Math.min(540, Dimensions.get("window").height * 0.55);

export default function ProductDetailScreen(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const t = useT();
  const display = useDisplay();
  const track = useTracking();
  const requireAuth = useRequireAuth();
  const user = useAuth((s) => s.user);
  const { palette } = useTheme();
  const [showSpecs, setShowSpecs] = useState(false);

  const q = useQuery({
    queryKey: ["mobile-product", id],
    queryFn: () => api.request<{ data: Product }>("GET", `/api/products/${id}`),
    enabled: !!id,
  });
  const p = q.data?.data;

  // Tapping Buy hands off to the guided checkout (ID → fulfillment → location
  // → confirm), which places the order. Keeps the product page clean.
  const goToCheckout = (): void => {
    requireAuth(() => {
      router.push({
        pathname: "/checkout",
        params: {
          kind: "buy",
          id: String(id),
          title: p?.name ?? "",
          price: String(Number(p?.priceEgp ?? 0)),
        },
      });
    });
  };

  if (q.isError) {
    return <ErrorState onRetry={() => void q.refetch()} />;
  }

  if (!p) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: palette.bg,
        }}
      >
        <Text style={{ color: palette.muted }}>
          {q.isLoading ? t("common.loading") : t("buy.notFound")}
        </Text>
      </View>
    );
  }

  const isCart = p.category === "cart_new" || p.category === "cart_used";
  const categoryKeys: Record<string, string> = {
    cart_new: "buy.categoryCartNew",
    cart_used: "buy.categoryCartUsed",
    parts: "buy.categoryParts",
    accessory: "buy.categoryAccessory",
  };
  const categoryLabel = categoryKeys[p.category]
    ? t(categoryKeys[p.category])
    : p.category.replace("_", " ");

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Hero carousel */}
        <View
          style={{ width: W, height: HERO_H, backgroundColor: "#EAEAF0", position: "relative" }}
        >
          <ImageCarousel urls={p.images} width={W} height={HERO_H} />
          <Pressable
            onPress={() => router.back()}
            style={{
              position: "absolute",
              top: 56,
              left: 16,
              backgroundColor: "rgba(255,255,255,0.92)",
              borderRadius: 999,
              width: 40,
              height: 40,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "700" }}>‹</Text>
          </Pressable>
          <ShareButton
            kind="buy"
            id={p.id}
            title={p.name}
            style={{
              position: "absolute",
              top: 56,
              right: 16,
              backgroundColor: "rgba(255,255,255,0.92)",
              borderRadius: 999,
              width: 40,
              height: 40,
              alignItems: "center",
              justifyContent: "center",
            }}
            iconColor="#02011F"
            size={20}
          />
        </View>

        {/* Content */}
        <View style={{ padding: 24 }}>
          <Text
            style={{
              fontSize: 11,
              letterSpacing: track(2),
              color: palette.muted,
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            {categoryLabel}
            {p.brand ? ` · ${p.brand}` : ""}
          </Text>
          <Text style={[{ fontSize: 30, color: palette.text, lineHeight: 32 }, display(0)]}>
            {p.name}
          </Text>
          <View style={{ marginTop: 14 }}>
            <PriceGate size="lg">
              <Text
                style={[
                  {
                    fontSize: 36,
                    color: palette.text,
                  },
                  display(0.3),
                ]}
              >
                {t("buy.egp")} {Number(p.priceEgp).toLocaleString()}
              </Text>
            </PriceGate>
          </View>

          {p.description ? (
            <Text style={{ marginTop: 14, color: palette.text, lineHeight: 22 }}>
              {p.description}
            </Text>
          ) : null}

          {(p.brand || p.model || p.year) && (
            <View style={{ marginTop: 18 }}>
              <Pressable onPress={() => setShowSpecs((s) => !s)}>
                <Text style={{ color: colors.brand.friendlyBlue, fontWeight: "700", fontSize: 13 }}>
                  {showSpecs ? t("buy.hideDetails") : t("buy.showDetails")}
                </Text>
              </Pressable>
              {showSpecs ? (
                <View
                  style={{
                    marginTop: 10,
                    backgroundColor: palette.card,
                    borderRadius: 14,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: palette.border,
                    gap: 8,
                  }}
                >
                  {p.brand ? <Spec label={t("buy.specBrand")} value={p.brand} /> : null}
                  {p.model ? <Spec label={t("buy.specModel")} value={p.model} /> : null}
                  {p.year ? <Spec label={t("buy.specYear")} value={String(p.year)} /> : null}
                </View>
              ) : null}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sticky CTA */}
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: palette.card,
          paddingHorizontal: 16,
          paddingVertical: 14,
          paddingBottom: 28,
          borderTopWidth: 1,
          borderTopColor: palette.border,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        {!user ? (
          <Pressable
            onPress={() => router.push("/(auth)/phone")}
            style={({ pressed }) => ({
              flex: 1,
              paddingHorizontal: 26,
              paddingVertical: 14,
              borderRadius: 12,
              backgroundColor: colors.brand.trendyPink,
              alignItems: "center",
              transform: [{ scale: pressed ? 0.96 : 1 }],
            })}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
              {t("auth.seePrice")}
            </Text>
          </Pressable>
        ) : (
          <>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: palette.muted }}>{t("buy.total")}</Text>
              <Text style={[{ fontSize: 22, color: palette.text }, display(0)]}>
                {t("buy.egp")} {Number(p.priceEgp).toLocaleString()}
              </Text>
            </View>
            <Pressable
              disabled={!p.inStock}
              onPress={goToCheckout}
              style={({ pressed }) => ({
                paddingHorizontal: 26,
                paddingVertical: 14,
                borderRadius: 12,
                backgroundColor: !p.inStock ? "rgba(2,1,31,0.2)" : colors.brand.friendlyBlue,
                transform: [{ scale: pressed ? 0.96 : 1 }],
              })}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
                {!p.inStock ? t("buy.unavailable") : isCart ? t("buy.reserveNow") : t("buy.buyNow")}
              </Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

function Spec({ label, value }: { label: string; value: string }): React.JSX.Element {
  const { palette } = useTheme();
  return (
    <View style={{ flexDirection: "row" }}>
      <Text style={{ width: 72, color: palette.muted }}>{label}</Text>
      <Text style={{ flex: 1, fontWeight: "600", color: palette.text }}>{value}</Text>
    </View>
  );
}
