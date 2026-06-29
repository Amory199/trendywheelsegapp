import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { colors, type Palette } from "@trendywheels/ui-tokens";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { BackButton } from "../../components/BackButton";
import { api } from "../../lib/api";
import { translate, useT } from "../../lib/locale";
import { useTheme } from "../../lib/use-theme";

interface InventoryVehicle {
  id: string;
  name: string;
  type: string;
  seating: number;
  dailyRate: number | string;
  salePrice?: number | string | null;
  listingType?: "rent" | "sale" | "both";
  location: string;
  status: string;
  images?: Array<{ url: string }>;
}

type StatusFilter = "all" | "available" | "rented" | "maintenance";

const STATUS_FILTERS: { key: StatusFilter; labelKey: string }[] = [
  { key: "all", labelKey: "crm.inventory.filterAll" },
  { key: "available", labelKey: "crm.inventory.filterAvailable" },
  { key: "rented", labelKey: "crm.inventory.filterRented" },
  { key: "maintenance", labelKey: "crm.inventory.filterMaintenance" },
];

// Vehicles can be rent-only, sale-only, or both. Rent/both show the daily
// rate; sale-only shows the one-off sale price (no "/day"). Decimal fields
// arrive as strings over JSON, hence the Number() coercion + zero guards.
function priceLabel(v: InventoryVehicle): string {
  const listing = v.listingType ?? "rent";
  const daily = Number(v.dailyRate);
  const sale = v.salePrice == null ? 0 : Number(v.salePrice);
  if (listing === "sale") {
    return sale > 0 ? `EGP ${sale.toLocaleString()}` : "—";
  }
  return daily > 0 ? `EGP ${daily.toLocaleString()}${translate("crm.inventory.perDay")}` : "—";
}

export default function CrmInventory(): JSX.Element {
  const { palette } = useTheme();
  const t = useT();
  const router = useRouter();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  const listQ = useQuery({
    queryKey: ["crm", "inventory"],
    queryFn: async (): Promise<InventoryVehicle[]> => {
      const r = await api.crmInventory();
      return (r.data ?? []) as InventoryVehicle[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (listQ.data ?? []).filter((v) => {
      if (status !== "all" && v.status !== status) return false;
      if (!q) return true;
      const hay = `${v.name ?? ""} ${v.location ?? ""} ${v.type ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [listQ.data, search, status]);

  // Hand a customer a ready-to-send pitch: cart name, price, location + the
  // public listing link. Opens the OS share sheet so the agent picks WhatsApp
  // (or any channel) and the recipient — no in-app contact list needed.
  const shareVehicle = async (v: InventoryVehicle): Promise<void> => {
    const url = `https://app.trendywheelseg.com/rent/${v.id}`;
    const message = `${t("crm.inventory.shareLead")}\n\n${v.name} — ${priceLabel(v)}\n📍 ${v.location}\n\n${url}`;
    try {
      await Share.share({ message });
    } catch {
      /* sheet dismissed — no-op */
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <BackButton style={{ marginLeft: -8, marginBottom: 6 }} fallback="/crm/pipeline" />
        <Text style={styles.title}>{t("crm.inventory.title")}</Text>
        <Text style={styles.subtitle}>
          {filtered.length} {t("crm.inventory.countConnector")} {listQ.data?.length ?? 0}{" "}
          {t("crm.inventory.countSuffix")}
        </Text>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color={palette.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder={t("crm.inventory.searchPlaceholder")}
          placeholderTextColor={palette.muted}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {search.length > 0 ? (
          <Pressable onPress={() => setSearch("")} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={palette.muted} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {STATUS_FILTERS.map((f) => {
          const active = status === f.key;
          return (
            <Pressable
              key={f.key}
              onPress={() => setStatus(f.key)}
              style={[styles.filterChip, active && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, active && { color: "#fff" }]}>
                {t(f.labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {listQ.isLoading ? (
        <ActivityIndicator color={colors.brand.trendyPink} style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(v) => v.id}
          numColumns={2}
          removeClippedSubviews
          windowSize={7}
          columnWrapperStyle={{ gap: 10 }}
          contentContainerStyle={{
            paddingHorizontal: 14,
            paddingTop: 6,
            paddingBottom: 120,
            gap: 10,
          }}
          refreshControl={
            <RefreshControl
              refreshing={listQ.isFetching}
              onRefresh={() => listQ.refetch()}
              tintColor={palette.text}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="car-sport-outline" size={48} color={palette.muted} />
              <Text style={styles.emptyText}>
                {search || status !== "all"
                  ? t("crm.inventory.emptyNoMatches")
                  : t("crm.inventory.emptyNoVehicles")}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() =>
                // Staff stay in the sales-scoped vehicle screen (view + the
                // standard available/reserved/sold toggle), NOT the admin
                // console at /admin/vehicles/[id] — tapping a vehicle was
                // dumping sales agents into admin-only edit screens.
                router.push({ pathname: "/inventory/[id]", params: { id: item.id } })
              }
            >
              {item.images?.[0]?.url ? (
                <Image
                  source={{ uri: item.images[0].url }}
                  style={styles.thumb}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.thumb, { backgroundColor: palette.bg }]} />
              )}
              <Pressable
                onPress={() => void shareVehicle(item)}
                hitSlop={8}
                style={styles.shareBtn}
                accessibilityLabel={t("crm.inventory.share")}
              >
                <Ionicons name="share-social" size={15} color="#fff" />
              </Pressable>
              <Text style={styles.name} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.sub} numberOfLines={1}>
                {item.seating}
                {t("crm.inventory.seaterSuffix")} · {item.location}
              </Text>
              <View style={styles.cardFooter}>
                <Text style={styles.price}>{priceLabel(item)}</Text>
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor:
                        item.status === "available"
                          ? "#A9F453"
                          : item.status === "rented"
                            ? "#F5B800"
                            : palette.muted,
                    },
                  ]}
                />
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

function makeStyles(palette: Palette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: palette.bg },
    header: { paddingTop: 72, paddingHorizontal: 18, paddingBottom: 8 },
    title: { color: palette.text, fontSize: 24, fontWeight: "700" },
    subtitle: { color: palette.muted, fontSize: 12, marginTop: 4 },
    searchBar: {
      marginHorizontal: 14,
      marginTop: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: palette.card,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      height: 42,
    },
    searchInput: {
      flex: 1,
      color: palette.text,
      fontSize: 14,
      letterSpacing: 0,
      paddingVertical: 0,
    },
    filterRow: {
      paddingHorizontal: 14,
      paddingTop: 8,
      paddingBottom: 4,
      gap: 8,
      alignItems: "center",
    },
    filterChip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: palette.card,
      borderWidth: 1,
      borderColor: palette.border,
    },
    filterChipActive: {
      backgroundColor: colors.brand.friendlyBlue,
      borderColor: colors.brand.friendlyBlue,
    },
    // Inactive label uses high-contrast white-on-dark; active still gets the
    // explicit `{ color: "#fff" }` override. The previous text.secondary was so
    // low-contrast on dark.card that the labels disappeared until tapped.
    filterChipText: { color: palette.text, fontWeight: "700", fontSize: 12 },
    empty: { alignItems: "center", paddingVertical: 60, gap: 10 },
    emptyText: { color: palette.muted, fontSize: 13 },
    card: {
      flex: 1,
      backgroundColor: palette.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: palette.border,
      padding: 10,
      gap: 6,
    },
    thumb: {
      width: "100%",
      aspectRatio: 4 / 3,
      borderRadius: 10,
      backgroundColor: palette.cardAlt,
    },
    name: { color: palette.text, fontSize: 13, fontWeight: "700" },
    sub: { color: palette.muted, fontSize: 11 },
    cardFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 2,
    },
    price: { color: colors.brand.trendyPink, fontSize: 13, fontWeight: "700" },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    shareBtn: {
      position: "absolute",
      top: 16,
      right: 16,
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: "rgba(2,1,31,0.55)",
      alignItems: "center",
      justifyContent: "center",
    },
  });
}
