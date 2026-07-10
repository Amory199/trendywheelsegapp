import { Ionicons } from "@expo/vector-icons";
import { colors } from "@trendywheels/ui-tokens";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as SecureStore from "expo-secure-store";
import { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ViewToken,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useLocale, useT } from "../lib/locale";

// First-run onboarding carousel (the April design): three swipeable slides
// introducing rent / buy-sell / repairs. Shown ONCE, right after the user picks
// a language — mounted UNDER LanguageGate in z-order so the picker appears
// first and dismissing it reveals the carousel. Persists its own seen-flag in
// SecureStore (same storage the language gate uses) so it never comes back,
// including across the RTL reload that picking Arabic triggers.
const INTRO_SEEN_KEY = "tw_intro_seen";

interface Slide {
  key: string;
  image: number;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  titleKey: string;
  bodyKey: string;
}

// Bundled category photos (same assets CategoryStrip uses) — instant render,
// no network. Each slide gets a photo card + dark veil for text legibility.
const SLIDES: Slide[] = [
  {
    key: "rent",
    image: require("../assets/categories/golf-cart.jpg"),
    icon: "key-outline",
    titleKey: "home.intro.slide1Title",
    bodyKey: "home.intro.slide1Body",
  },
  {
    key: "buy-sell",
    image: require("../assets/categories/buggy.jpg"),
    icon: "pricetag-outline",
    titleKey: "home.intro.slide2Title",
    bodyKey: "home.intro.slide2Body",
  },
  {
    key: "repairs",
    image: require("../assets/categories/utv.jpg"),
    icon: "construct-outline",
    titleKey: "home.intro.slide3Title",
    bodyKey: "home.intro.slide3Body",
  },
];

export function IntroCarousel(): React.JSX.Element | null {
  const hydrated = useLocale((s) => s.hydrated);
  const chosen = useLocale((s) => s.chosen);
  const t = useT();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);
  // null = SecureStore read still in flight — render nothing until we know,
  // so the carousel never flashes for users who already dismissed it.
  const [seen, setSeen] = useState<boolean | null>(null);

  useEffect(() => {
    SecureStore.getItemAsync(INTRO_SEEN_KEY)
      .then((v) => setSeen(v === "1"))
      .catch(() => setSeen(false));
  }, []);

  // Stable refs — FlatList requires onViewableItemsChanged to never change
  // identity. Viewability (not offset math) keeps the index RTL-correct.
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }): void => {
      const first = viewableItems[0];
      if (first?.index != null) setIndex(first.index);
    },
  ).current;
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  // Language not picked yet (gate is still up / about to show) or intro
  // already dismissed — stay out of the tree entirely.
  if (!hydrated || !chosen || seen !== false) return null;

  const dismiss = (): void => {
    setSeen(true);
    // Fire-and-forget: worst case the carousel shows once more next launch.
    SecureStore.setItemAsync(INTRO_SEEN_KEY, "1").catch(() => {
      // Non-fatal — see above.
    });
  };

  const next = (): void => {
    if (index >= SLIDES.length - 1) {
      dismiss();
      return;
    }
    listRef.current?.scrollToIndex({ index: index + 1, animated: true });
  };

  const last = index === SLIDES.length - 1;
  const cardHeight = Math.min(height * 0.46, 420);

  return (
    <Animated.View entering={FadeIn.duration(220)} style={styles.root}>
      <FlatList<Slide>
        ref={listRef}
        data={SLIDES}
        keyExtractor={(s) => s.key}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width, paddingTop: insets.top + 76 }]}>
            <View style={[styles.photoCard, { height: cardHeight }]}>
              <Image
                source={item.image}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={200}
              />
              {/* Dark veil so the icon badge + any bright photo stay legible —
                  same photo + gradient pattern as the CategoryStrip tiles. */}
              <LinearGradient
                colors={["rgba(2,1,31,0.05)", "rgba(2,1,31,0.72)"]}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />
              <View style={styles.iconBadge}>
                <Ionicons name={item.icon} size={22} color="#fff" />
              </View>
            </View>
            <Text style={styles.title}>{t(item.titleKey as Parameters<typeof t>[0])}</Text>
            <Text style={styles.body}>{t(item.bodyKey as Parameters<typeof t>[0])}</Text>
          </View>
        )}
      />

      <Pressable style={[styles.skip, { top: insets.top + 12 }]} onPress={dismiss} hitSlop={12}>
        <Text style={styles.skipText}>{t("home.intro.skip")}</Text>
      </Pressable>

      <View style={[styles.controls, { paddingBottom: insets.bottom + 28 }]}>
        <View style={styles.dots}>
          {SLIDES.map((s, i) => (
            <View key={s.key} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
        <Pressable
          style={({ pressed }) => [styles.next, pressed && styles.nextPressed]}
          onPress={next}
          hitSlop={8}
        >
          <Text style={styles.nextText}>
            {last ? t("home.intro.getStarted") : t("home.intro.next")}
          </Text>
          <Ionicons name={last ? "checkmark" : "arrow-forward"} size={18} color="#fff" />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    // Under LanguageGate (10001), over the app — MobileIntro's cold-start
    // splash mounts after this sibling so it still plays on top, then fades
    // out to reveal the carousel.
    zIndex: 10000,
    backgroundColor: colors.dark.bg,
  },
  slide: {
    paddingHorizontal: 24,
    gap: 18,
  },
  photoCard: {
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  iconBadge: {
    position: "absolute",
    bottom: 16,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 6,
  },
  body: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  skip: { position: "absolute", right: 20, padding: 10 },
  skipText: { color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: "600" },
  controls: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
  },
  dots: { flexDirection: "row", gap: 8 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  dotActive: { width: 22, backgroundColor: colors.brand.trendyPink },
  next: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.brand.trendyPink,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 999,
  },
  nextPressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  nextText: { color: "#fff", fontSize: 15, fontWeight: "800" },
});
