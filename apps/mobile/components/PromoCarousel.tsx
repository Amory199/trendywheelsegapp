import { Ionicons } from "@expo/vector-icons";
import { isRTL } from "@trendywheels/i18n";
import { colors } from "@trendywheels/ui-tokens";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { useLocale, useT } from "../lib/locale";
import { useDisplay } from "../lib/typography";

const INK = "#02011F";
const H_PAD = 16;
const CARD_HEIGHT = 170;
const AUTO_ADVANCE_MS = 4500;

// Static, fully guest-safe promo deck. Replaces the old expo-video promo banner
// (expo-video is NOT in the OTA allowlist). Every string is an i18n key, every
// CTA routes to a public, guest-browsable tab. No video asset, no countdowns,
// no fabricated discounts — chips state real, non-time-bound facts only.
type Promo = {
  key: string;
  titleKey: string;
  // 1–2 honest, non-time-bound fact chips.
  chipKeys: string[];
  gradient: [string, string];
  route: string;
};

const PROMOS: Promo[] = [
  {
    key: "browse",
    titleKey: "home.promoBrowseTitle",
    chipKeys: ["home.promoChipRentBuy", "home.promoChipNoAccount"],
    gradient: [colors.brand.friendlyBlue, colors.brand.trendyPink],
    route: "/(tabs)/buy",
  },
  {
    key: "cross",
    titleKey: "home.promoCrossTitle",
    chipKeys: ["home.promoChipRentBuy"],
    gradient: [colors.brand.poolBlue, colors.brand.ecoLimelight],
    route: "/(tabs)/rent",
  },
  {
    key: "service",
    titleKey: "home.promoServiceTitle",
    chipKeys: ["home.promoChipFreeDelivery"],
    gradient: [colors.brand.friendlyBlue, colors.brand.poolBlue],
    route: "/service/pickup-delivery",
  },
];

/**
 * Home promo carousel. Horizontal paging FlatList (reuses ImageCarousel's
 * onMomentumScrollEnd → active-index + tappable expanding-dots pattern) with
 * a setInterval auto-advance that pauses while the user drags and clears on
 * unmount. Renders identically for guests; all CTAs land on public tabs.
 */
export function PromoCarousel(): JSX.Element {
  const router = useRouter();
  const t = useT();
  const display = useDisplay();
  const locale = useLocale((s) => s.locale);
  const rtl = isRTL(locale);
  const { width } = useWindowDimensions();

  const [idx, setIdx] = useState(0);
  const listRef = useRef<FlatList<Promo>>(null);
  // Paused while the finger is down so auto-advance never fights a manual swipe.
  const draggingRef = useRef(false);
  const idxRef = useRef(0);

  const cardWidth = width - H_PAD * 2;
  // Page width includes the trailing separator so paging snaps card-to-card.
  const pageWidth = cardWidth + H_PAD;

  const setActive = useCallback((next: number) => {
    idxRef.current = next;
    setIdx(next);
  }, []);

  const onMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
      setActive(Math.max(0, Math.min(next, PROMOS.length - 1)));
    },
    [pageWidth, setActive],
  );

  useEffect(() => {
    if (PROMOS.length <= 1) return;
    const timer = setInterval(() => {
      if (draggingRef.current) return;
      const next = (idxRef.current + 1) % PROMOS.length;
      listRef.current?.scrollToIndex({ index: next, animated: true });
      setActive(next);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [setActive]);

  return (
    <Animated.View entering={FadeIn.duration(280)} style={styles.wrap}>
      <FlatList
        ref={listRef}
        data={PROMOS}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={pageWidth}
        snapToAlignment="start"
        disableIntervalMomentum
        onScrollBeginDrag={() => {
          draggingRef.current = true;
        }}
        onScrollEndDrag={() => {
          draggingRef.current = false;
        }}
        onMomentumScrollEnd={onMomentumEnd}
        getItemLayout={(_, i) => ({
          length: pageWidth,
          offset: pageWidth * i,
          index: i,
        })}
        ItemSeparatorComponent={Separator}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(item.route as never)} style={{ width: cardWidth }}>
            <LinearGradient
              colors={item.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.card}
            >
              <Text style={[styles.title, display(0.3)]} numberOfLines={2}>
                {t(item.titleKey)}
              </Text>

              <View style={styles.chipRow}>
                {item.chipKeys.map((ck) => (
                  <View key={ck} style={styles.chip}>
                    <Text style={styles.chipText} numberOfLines={1}>
                      {t(ck)}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.ctaRow}>
                <View style={styles.cta}>
                  <Text style={styles.ctaText}>{t("home.promoCta")}</Text>
                  <Ionicons name={rtl ? "arrow-back" : "arrow-forward"} size={15} color={INK} />
                </View>
              </View>
            </LinearGradient>
          </Pressable>
        )}
      />

      {PROMOS.length > 1 ? (
        <View style={styles.dots}>
          {PROMOS.map((p, i) => (
            <Pressable
              key={p.key}
              hitSlop={8}
              onPress={() => {
                listRef.current?.scrollToIndex({ index: i, animated: true });
                setActive(i);
              }}
              style={[
                styles.dot,
                {
                  width: i === idx ? 26 : 8,
                  backgroundColor: i === idx ? colors.brand.friendlyBlue : "rgba(2,1,31,0.18)",
                },
              ]}
            />
          ))}
        </View>
      ) : null}
    </Animated.View>
  );
}

function Separator(): JSX.Element {
  return <View style={{ width: H_PAD }} />;
}

const styles = StyleSheet.create({
  wrap: { marginTop: 22 },
  listContent: { paddingHorizontal: H_PAD },
  card: {
    height: CARD_HEIGHT,
    borderRadius: 20,
    padding: 20,
    justifyContent: "space-between",
    overflow: "hidden",
  },
  title: {
    fontSize: 26,
    color: "#fff",
    lineHeight: 28,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  chipText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  ctaRow: {
    flexDirection: "row",
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  ctaText: {
    color: INK,
    fontSize: 13,
    fontWeight: "800",
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 14,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
});
