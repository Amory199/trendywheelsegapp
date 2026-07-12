import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { type Vehicle } from "@trendywheels/types";
import { TAB_BAR_SAFE_BOTTOM } from "@trendywheels/ui-tokens";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Dimensions, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ListingCard } from "../components/ListingCard";
import { api } from "../lib/api";
import { useT } from "../lib/locale";
import { useRTL } from "../lib/typography";
import { vehicleImageUrl } from "../lib/vehicle";

const INK = "#02011F";
const MUTED = "rgba(2,1,31,0.55)";
const PADDING = 16;
const GAP = 12;
const COL_W = (Dimensions.get("window").width - PADDING * 2 - GAP) / 2;

interface Product {
  id: string;
  name: string;
  priceEgp: string | number;
  images: string[];
  inStock: boolean;
  brand?: string | null;
}

type Result = { kind: "vehicle"; item: Vehicle } | { kind: "product"; item: Product };

export default function SearchScreen(): JSX.Element {
  const router = useRouter();
  const t = useT();
  const rtl = useRTL();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");

  // Whole catalog fetched once, filtered on-device — there is no dedicated
  // search endpoint yet and the inventory is small enough that this is instant.
  const hasQuery = query.trim().length > 0;
  const vehiclesQ = useQuery({
    queryKey: ["search-vehicles"],
    queryFn: () => api.request<{ data: Vehicle[] }>("GET", "/api/vehicles?limit=100"),
    enabled: hasQuery,
  });
  const productsQ = useQuery({
    queryKey: ["search-products"],
    queryFn: () => api.request<{ data: Product[] }>("GET", "/api/products?limit=100"),
    enabled: hasQuery,
  });

  const loading = vehiclesQ.isLoading || productsQ.isLoading;
  const hasError = vehiclesQ.isError || productsQ.isError;

  const results = useMemo<Result[]>(() => {
    const s = query.trim().toLowerCase();
    if (!s) return [];
    const vehicles = (vehiclesQ.data?.data ?? []) as Vehicle[];
    const products = (productsQ.data?.data ?? []) as Product[];
    const vMatches: Result[] = vehicles
      .filter((v) => `${v.name} ${v.category} ${v.location}`.toLowerCase().includes(s))
      .map((item) => ({ kind: "vehicle", item }));
    const pMatches: Result[] = products
      .filter((p) => `${p.name} ${p.brand ?? ""}`.toLowerCase().includes(s))
      .map((item) => ({ kind: "product", item }));
    return [...vMatches, ...pMatches];
  }, [query, vehiclesQ.data, productsQ.data]);

  const renderResult = (r: Result): JSX.Element => {
    if (r.kind === "vehicle") {
      const v = r.item;
      // dailyRate / salePrice arrive as Prisma Decimal strings — coerce before
      // comparing or formatting so the thousands separators actually apply.
      const rate = Number(v.dailyRate);
      const sale = Number(v.salePrice ?? 0);
      const priceLabel =
        rate > 0
          ? `${t("home.egp")} ${rate.toLocaleString()}${t("home.perDay")}`
          : sale > 0
            ? `${t("home.egp")} ${sale.toLocaleString()}`
            : "";
      return (
        <ListingCard
          width={COL_W}
          title={v.name}
          priceLabel={priceLabel}
          image={vehicleImageUrl(v.images?.[0])}
          rating={v.averageRating}
          location={v.location}
          categoryKey={v.category}
          fuelType={v.fuelType}
          onPress={() => router.push(`/rent/${v.id}` as never)}
        />
      );
    }
    const p = r.item;
    return (
      <ListingCard
        width={COL_W}
        title={p.name}
        priceLabel={`${t("home.egp")} ${Number(p.priceEgp).toLocaleString()}`}
        image={p.images?.[0]}
        overlayLabel={!p.inStock ? t("buy.outOfStock") : null}
        onPress={() => router.push(`/buy/${p.id}` as never)}
      />
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={INK} />
        </Pressable>
        <View style={styles.field}>
          <Ionicons name="search" size={18} color="rgba(2,1,31,0.45)" />
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder={t("home.searchPlaceholder")}
            placeholderTextColor="rgba(2,1,31,0.45)"
            textAlign={rtl ? "right" : "left"}
            autoFocus
            returnKeyType="search"
            autoCorrect={false}
          />
          {query.length > 0 ? (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color="rgba(2,1,31,0.35)" />
            </Pressable>
          ) : null}
        </View>
      </View>

      {!query.trim() ? (
        <View style={styles.center}>
          <Ionicons name="search-outline" size={56} color="rgba(2,1,31,0.18)" />
          <Text style={styles.hint}>{t("home.searchHint")}</Text>
        </View>
      ) : loading ? (
        <Text style={styles.loading}>{t("common.loading")}</Text>
      ) : hasError ? (
        <Pressable
          style={styles.center}
          onPress={() => {
            void vehiclesQ.refetch();
            void productsQ.refetch();
          }}
        >
          <Ionicons name="cloud-offline-outline" size={56} color="rgba(2,1,31,0.18)" />
          <Text style={styles.hint}>
            {t("common.error")} · {t("common.tryAgain")}
          </Text>
        </Pressable>
      ) : results.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="sad-outline" size={56} color="rgba(2,1,31,0.18)" />
          <Text style={styles.hint}>
            {t("home.searchNoResults")} {query.trim()}
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(r) => `${r.kind}:${r.item.id}`}
          numColumns={2}
          columnWrapperStyle={{ gap: GAP }}
          contentContainerStyle={{
            padding: PADDING,
            gap: 16,
            paddingBottom: TAB_BAR_SAFE_BOTTOM,
          }}
          renderItem={({ item }) => renderResult(item)}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F7FB" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: PADDING,
    paddingBottom: 12,
  },
  field: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(2,1,31,0.08)",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  input: { flex: 1, fontSize: 14, color: INK, padding: 0 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  hint: { fontSize: 14, color: MUTED, textAlign: "center" },
  loading: { padding: 40, color: MUTED },
});
