import { useQuery } from "@tanstack/react-query";
import { colors, TAB_BAR_SAFE_BOTTOM } from "@trendywheels/ui-tokens";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as React from "react";
import { useState } from "react";
import { Dimensions, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { api } from "../../lib/api";
import { useTabBarScrollHandler } from "../../lib/tab-bar-scroll";

type Category = "cart_new" | "cart_used" | "parts" | "accessory";

interface Product {
  id: string;
  category: Category;
  name: string;
  priceEgp: string | number;
  images: string[];
  inStock: boolean;
  brand?: string | null;
}

const TABS: { id: Category | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "cart_new", label: "New" },
  { id: "cart_used", label: "Used" },
  { id: "parts", label: "Parts" },
  { id: "accessory", label: "Access." },
];

const CARD_GAP = 12;
const PADDING = 16;
const W = (Dimensions.get("window").width - PADDING * 2 - CARD_GAP) / 2;

export default function BuyScreen(): React.JSX.Element {
  const router = useRouter();
  const [tab, setTab] = useState<Category | "all">("all");
  const scrollHandler = useTabBarScrollHandler();

  const q = useQuery({
    queryKey: ["mobile-products", tab],
    queryFn: () => {
      const url =
        tab === "all" ? "/api/products?limit=80" : `/api/products?category=${tab}&limit=80`;
      return api.request<{ data: Product[] }>("GET", url);
    },
  });
  const items = q.data?.data ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: "#F7F7FB" }}>
      <View style={{ paddingTop: 60, paddingHorizontal: PADDING, paddingBottom: 12 }}>
        <Text style={{ fontFamily: "Anton", fontSize: 38, color: "#02011F", letterSpacing: 0.4 }}>
          Catalog
        </Text>
        <Text style={{ fontSize: 13, color: "rgba(2,1,31,0.55)", marginTop: 2 }}>
          Carts, parts, and accessories.
        </Text>
      </View>

      <View style={{ paddingHorizontal: PADDING, marginBottom: 12 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <Pressable
                key={t.id}
                onPress={() => setTab(t.id)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 9,
                  marginRight: 8,
                  borderRadius: 999,
                  backgroundColor: active ? "#02011F" : "#fff",
                  borderWidth: active ? 0 : 1,
                  borderColor: "rgba(2,1,31,0.12)",
                }}
              >
                <Text
                  style={{ color: active ? "#fff" : "#02011F", fontWeight: "700", fontSize: 13 }}
                >
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingHorizontal: PADDING,
          paddingBottom: TAB_BAR_SAFE_BOTTOM,
          flexDirection: "row",
          flexWrap: "wrap",
          gap: CARD_GAP,
        }}
      >
        {q.isLoading ? (
          <Text style={{ padding: 40, color: "rgba(2,1,31,0.5)" }}>Loading…</Text>
        ) : items.length === 0 ? (
          <Text style={{ padding: 40, color: "rgba(2,1,31,0.5)" }}>Nothing here yet.</Text>
        ) : (
          items.map((p, i) => (
            <Animated.View key={p.id} entering={FadeInDown.duration(280).delay(i * 30)}>
              <Pressable
                onPress={() => router.push(`/buy/${p.id}` as never)}
                style={({ pressed }) => ({
                  width: W,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                })}
              >
                <View
                  style={{
                    width: W,
                    height: W,
                    borderRadius: 14,
                    overflow: "hidden",
                    backgroundColor: "#EAEAF0",
                  }}
                >
                  {p.images[0] ? (
                    <Image
                      source={p.images[0]}
                      style={{ flex: 1 }}
                      contentFit="cover"
                      transition={250}
                    />
                  ) : null}
                  {!p.inStock ? (
                    <View
                      style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        top: 0,
                        bottom: 0,
                        backgroundColor: "rgba(2,1,31,0.55)",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text
                        style={{
                          color: "#fff",
                          fontWeight: "700",
                          letterSpacing: 1.5,
                          fontSize: 11,
                        }}
                      >
                        OUT OF STOCK
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text
                  numberOfLines={1}
                  style={{ marginTop: 8, fontSize: 13, fontWeight: "700", color: "#02011F" }}
                >
                  {p.name}
                </Text>
                <Text
                  style={{
                    fontFamily: "Anton",
                    fontSize: 18,
                    color: colors.brand.trendyPink,
                    marginTop: 2,
                    letterSpacing: 0.3,
                  }}
                >
                  EGP {Number(p.priceEgp).toLocaleString()}
                </Text>
              </Pressable>
            </Animated.View>
          ))
        )}
      </Animated.ScrollView>
    </View>
  );
}
