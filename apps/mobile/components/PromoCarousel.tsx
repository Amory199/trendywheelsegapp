import { colors } from "@trendywheels/ui-tokens";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

const H_PAD = 16;
const CARD_HEIGHT = 170;
const AUTO_ADVANCE_MS = 4500;

// Static, fully guest-safe promo deck — now branded banner images (the artwork
// carries its own messaging) instead of the old gradient+text cards. Each banner
// is tappable and routes to a public, guest-browsable tab. No video asset, no
// countdowns; OTA-safe (expo-image is in the allowlist, bundled PNGs ship fine).
type Promo = {
  key: string;
  image: number;
  route: string;
};

const PROMOS: Promo[] = [
  { key: "browse", image: require("../assets/promos/promo-1.png"), route: "/(tabs)/buy" },
  { key: "cross", image: require("../assets/promos/promo-2.png"), route: "/(tabs)/rent" },
  {
    key: "service",
    image: require("../assets/promos/promo-3.png"),
    route: "/service/pickup-delivery",
  },
];

/**
 * Home promo carousel. Horizontal paging FlatList with active-index +
 * tappable expanding-dots, and a setInterval auto-advance that pauses while the
 * user drags and clears on unmount. Renders identically for guests; all CTAs
 * land on public tabs.
 */
export function PromoCarousel(): JSX.Element {
  const router = useRouter();
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
            <Image
              source={item.image}
              style={styles.card}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
            />
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
    width: "100%",
    borderRadius: 20,
    overflow: "hidden",
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
