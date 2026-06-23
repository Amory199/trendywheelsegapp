import { useQuery } from "@tanstack/react-query";
import { TAB_BAR_SAFE_BOTTOM } from "@trendywheels/ui-tokens";
import { useRouter } from "expo-router";
import * as React from "react";
import { useState } from "react";
import { Dimensions, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ErrorState } from "../../components/ErrorState";
import { ListingCard } from "../../components/ListingCard";
import { api } from "../../lib/api";
import { useT } from "../../lib/locale";
import { useTabBarScrollHandler } from "../../lib/tab-bar-scroll";
import { useTheme } from "../../lib/use-theme";
import { useDisplay } from "../../lib/typography";

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
  const display = useDisplay();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Category | "all">("all");
  const scrollHandler = useTabBarScrollHandler();
  const { palette } = useTheme();

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
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: PADDING, paddingBottom: 12 }}>
        <Text style={[{ fontSize: 38, color: palette.text }, display(0.4)]}>
          {t("buy.catalogTitle")}
        </Text>
        <Text style={{ fontSize: 13, color: palette.muted, marginTop: 2 }}>
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
                  backgroundColor: active ? palette.text : palette.card,
                  borderWidth: active ? 0 : 1,
                  borderColor: palette.border,
                }}
              >
                <Text
                  style={{
                    color: active ? palette.bg : palette.text,
                    fontWeight: "700",
                    fontSize: 13,
                  }}
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
          <Text style={{ padding: 40, color: palette.muted }}>{t("common.loading")}</Text>
        ) : q.isError ? (
          <ErrorState onRetry={() => void q.refetch()} style={{ width: "100%", minHeight: 360 }} />
        ) : items.length === 0 ? (
          <Text style={{ padding: 40, color: palette.muted }}>{t("buy.emptyCatalog")}</Text>
        ) : (
          items.map((p, i) => (
            <Animated.View
              key={p.id}
              entering={FadeInDown.duration(280).delay(Math.min(i, 8) * 30)}
            >
              <ListingCard
                width={W}
                imageRatio={1}
                title={p.name}
                priceLabel={`${t("buy.egp")} ${Number(p.priceEgp).toLocaleString()}`}
                image={p.images[0]}
                overlayLabel={!p.inStock ? t("buy.outOfStock") : null}
                onPress={() => router.push(`/buy/${p.id}` as never)}
              />
            </Animated.View>
          ))
        )}
      </Animated.ScrollView>
    </View>
  );
}
