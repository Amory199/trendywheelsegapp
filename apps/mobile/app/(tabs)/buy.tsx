import { useQuery } from "@tanstack/react-query";
import { colors, TAB_BAR_SAFE_BOTTOM } from "@trendywheels/ui-tokens";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as React from "react";
import { useState } from "react";
import { Dimensions, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { api } from "../../lib/api";
import { useT } from "../../lib/locale";
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

const TABS: { id: Category | "all"; labelKey: string }[] = [
  { id: "all", labelKey: "buy.tabAll" },
  { id: "cart_new", labelKey: "buy.tabNew" },
  { id: "cart_used", labelKey: "buy.tabUsed" },
  { id: "parts", labelKey: "buy.tabParts" },
  { id: "accessory", labelKey: "buy.tabAccessory" },
];

const CARD_GAP = 12;
const PADDING = 16;
const W = (Dimensions.get("window").width - PADDING * 2 - CARD_GAP) / 2;

export default function BuyScreen(): React.JSX.Element {
  const router = useRouter();
  const t = useT();
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
          {t("buy.catalogTitle")}
        </Text>
        <Text style={{ fontSize: 13, color: "rgba(2,1,31,0.55)", marginTop: 2 }}>
          {t("buy.catalogSubtitle")}
        </Text>
      </View>

      <View style={{ paddingHorizontal: PADDING, marginBottom: 12 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {TABS.map((tabItem) => {
            const active = tab === tabItem.id;
            return (
              <Pressable
                key={tabItem.id}
                onPress={() => setTab(tabItem.id)}
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
                  {t(tabItem.labelKey)}
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
          <Text style={{ padding: 40, color: "rgba(2,1,31,0.5)" }}>{t("common.loading")}</Text>
        ) : items.length === 0 ? (
          <Text style={{ padding: 40, color: "rgba(2,1,31,0.5)" }}>{t("buy.emptyCatalog")}</Text>
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
                        {t("buy.outOfStock")}
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
                  {t("buy.egp")} {Number(p.priceEgp).toLocaleString()}
                </Text>
              </Pressable>
            </Animated.View>
          ))
        )}
      </Animated.ScrollView>
    </View>
  );
}
