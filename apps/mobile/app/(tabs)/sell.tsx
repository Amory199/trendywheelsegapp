import { colors, spacing, TAB_BAR_SAFE_BOTTOM } from "@trendywheels/ui-tokens";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { HubCard } from "../../components/HubCard";
import { useTabBarScrollHandler } from "../../lib/tab-bar-scroll";
import { useTheme } from "../../lib/use-theme";

const HUB_PATHS = [
  {
    href: "/sell/create",
    label: "Sell my cart outright",
    sub: "List your golf cart for sale. We handle the buyers.",
    image: "https://picsum.photos/seed/sell-outright/1200/700",
  },
  {
    href: "/sell/list-for-rent",
    label: "List my cart for rent",
    sub: "Earn passive income — we manage the rentals end-to-end.",
    image: "https://picsum.photos/seed/sell-list-rent/1200/700",
  },
  {
    href: "/sell/trade-in",
    label: "Trade in for a new one",
    sub: "Get a quote on yours, apply credit toward a fresh model.",
    image: "https://picsum.photos/seed/sell-trade-in/1200/700",
  },
] as const;

export default function SellScreen(): JSX.Element {
  const router = useRouter();
  const { palette } = useTheme();
  const scrollHandler = useTabBarScrollHandler();

  return (
    <Animated.ScrollView
      style={[styles.container, { backgroundColor: palette.bg }]}
      contentContainerStyle={styles.scrollContent}
      onScroll={scrollHandler}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: palette.text }]}>Got a cart?</Text>
        <Text style={[styles.subtitle, { color: palette.muted }]}>
          Three ways to turn it into something else.
        </Text>
      </View>

      <View style={styles.cards}>
        {HUB_PATHS.map((p, i) => (
          <Animated.View key={p.href} entering={FadeInDown.delay(i * 60).duration(360)}>
            <HubCard
              imageUri={p.image}
              label={p.label}
              sub={p.sub}
              onPress={() => router.push(p.href as never)}
            />
          </Animated.View>
        ))}
      </View>

      <View style={styles.footer}>
        <Text
          style={[styles.footerLink, { color: colors.brand.friendlyBlue }]}
          onPress={() => router.push("/sell/category/all" as never)}
        >
          Browse marketplace →
        </Text>
      </View>
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: TAB_BAR_SAFE_BOTTOM + 24 },
  header: { paddingTop: 60, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  title: { fontFamily: "Anton", fontSize: 44, lineHeight: 46, letterSpacing: 0.3 },
  subtitle: { fontSize: 15, marginTop: 8 },
  cards: { paddingHorizontal: spacing.lg, gap: 16, marginTop: 8 },
  footer: { paddingHorizontal: spacing.lg, marginTop: 28, alignItems: "center" },
  footerLink: { fontSize: 13, fontWeight: "700", letterSpacing: 0.4 },
});
