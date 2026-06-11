import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import { useState } from "react";
import { Alert, Dimensions, Pressable, ScrollView, Text, View } from "react-native";

import { logEvent } from "../../lib/analytics";
import { api } from "../../lib/api";

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
  const qc = useQueryClient();
  const [imgIdx, setImgIdx] = useState(0);
  const [showSpecs, setShowSpecs] = useState(false);

  const q = useQuery({
    queryKey: ["mobile-product", id],
    queryFn: () => api.request<{ data: Product }>("GET", `/api/products/${id}`),
    enabled: !!id,
  });
  const p = q.data?.data;

  const buy = useMutation({
    mutationFn: () =>
      api.request<{ data: { id: string } }>("POST", "/api/orders", {
        body: { items: [{ productId: id, quantity: 1 }] },
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["my-orders"] });
      const orderId = data?.data?.id;
      logEvent("order_created", { order_id: orderId ?? "unknown" });
      Alert.alert(
        "Order placed",
        orderId
          ? `Your order #${orderId.slice(0, 8)} is confirmed. You'll get updates via push and SMS.`
          : "Your order is confirmed. You'll get updates via push and SMS.",
        [{ text: "View my orders", onPress: () => router.push("/(tabs)/profile" as never) }],
      );
    },
    onError: (err) => {
      Alert.alert(
        "Could not place order",
        err instanceof Error ? err.message : "Please try again in a moment.",
      );
    },
  });

  if (!p) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#F7F7FB",
        }}
      >
        <Text style={{ color: "rgba(2,1,31,0.6)" }}>{q.isLoading ? "Loading…" : "Not found."}</Text>
      </View>
    );
  }

  const isCart = p.category === "cart_new" || p.category === "cart_used";

  return (
    <View style={{ flex: 1, backgroundColor: "#F7F7FB" }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Hero carousel */}
        <View
          style={{ width: W, height: HERO_H, backgroundColor: "#EAEAF0", position: "relative" }}
        >
          {p.images.map((src, i) => (
            <View
              key={i}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 0,
                bottom: 0,
                opacity: i === imgIdx ? 1 : 0,
              }}
            >
              <Image source={src} style={{ flex: 1 }} contentFit="cover" transition={400} />
            </View>
          ))}
          {p.images.length > 1 ? (
            <View
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 18,
                flexDirection: "row",
                justifyContent: "center",
                gap: 6,
              }}
            >
              {p.images.map((_, i) => (
                <Pressable
                  key={i}
                  onPress={() => setImgIdx(i)}
                  style={{
                    width: i === imgIdx ? 26 : 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: i === imgIdx ? "#fff" : "rgba(255,255,255,0.55)",
                  }}
                />
              ))}
            </View>
          ) : null}
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
        </View>

        {/* Content */}
        <View style={{ padding: 24 }}>
          <Text
            style={{
              fontSize: 11,
              letterSpacing: 2,
              color: "rgba(2,1,31,0.5)",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            {p.category.replace("_", " ")}
            {p.brand ? ` · ${p.brand}` : ""}
          </Text>
          <Text style={{ fontFamily: "Anton", fontSize: 30, color: "#02011F", lineHeight: 32 }}>
            {p.name}
          </Text>
          <Text
            style={{
              fontFamily: "Anton",
              fontSize: 36,
              color: colors.brand.trendyPink,
              marginTop: 14,
              letterSpacing: 0.3,
            }}
          >
            EGP {Number(p.priceEgp).toLocaleString()}
          </Text>

          {p.description ? (
            <Text style={{ marginTop: 14, color: "rgba(2,1,31,0.75)", lineHeight: 22 }}>
              {p.description}
            </Text>
          ) : null}

          {(p.brand || p.model || p.year) && (
            <View style={{ marginTop: 18 }}>
              <Pressable onPress={() => setShowSpecs((s) => !s)}>
                <Text style={{ color: colors.brand.friendlyBlue, fontWeight: "700", fontSize: 13 }}>
                  {showSpecs ? "Hide details ▴" : "Show details ▾"}
                </Text>
              </Pressable>
              {showSpecs ? (
                <View
                  style={{
                    marginTop: 10,
                    backgroundColor: "#fff",
                    borderRadius: 14,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: "rgba(2,1,31,0.06)",
                    gap: 8,
                  }}
                >
                  {p.brand ? <Spec label="Brand" value={p.brand} /> : null}
                  {p.model ? <Spec label="Model" value={p.model} /> : null}
                  {p.year ? <Spec label="Year" value={String(p.year)} /> : null}
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
          backgroundColor: "#fff",
          paddingHorizontal: 16,
          paddingVertical: 14,
          paddingBottom: 28,
          borderTopWidth: 1,
          borderTopColor: "rgba(2,1,31,0.06)",
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, color: "rgba(2,1,31,0.55)" }}>Total</Text>
          <Text style={{ fontFamily: "Anton", fontSize: 22, color: colors.brand.trendyPink }}>
            EGP {Number(p.priceEgp).toLocaleString()}
          </Text>
        </View>
        <Pressable
          disabled={!p.inStock || buy.isPending}
          onPress={() => buy.mutate()}
          style={({ pressed }) => ({
            paddingHorizontal: 26,
            paddingVertical: 14,
            borderRadius: 12,
            backgroundColor: !p.inStock ? "rgba(2,1,31,0.2)" : colors.brand.friendlyBlue,
            transform: [{ scale: pressed ? 0.96 : 1 }],
          })}
        >
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
            {buy.isPending
              ? "Placing…"
              : !p.inStock
                ? "Unavailable"
                : isCart
                  ? "Reserve now"
                  : "Buy now"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function Spec({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <View style={{ flexDirection: "row" }}>
      <Text style={{ width: 72, color: "rgba(2,1,31,0.55)" }}>{label}</Text>
      <Text style={{ flex: 1, fontWeight: "600", color: "#02011F" }}>{value}</Text>
    </View>
  );
}
