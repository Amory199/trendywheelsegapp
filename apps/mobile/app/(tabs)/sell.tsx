import { colors, spacing, TAB_BAR_SAFE_BOTTOM } from "@trendywheels/ui-tokens";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GuestGate } from "../../components/GuestGate";
import { HubCard } from "../../components/HubCard";
import { TWAurora } from "../../components/ui";
import { useAuth } from "../../lib/auth-store";
import { useT } from "../../lib/locale";
import { useTabBarScrollHandler } from "../../lib/tab-bar-scroll";
import { useDisplay, useTracking } from "../../lib/typography";
import { useTheme } from "../../lib/use-theme";

const HUB_PATHS = [
  {
    href: "/sell/create",
    labelKey: "sell.hub.sellOutright",
    subKey: "sell.hub.sellOutrightSub",
    image: require("../../assets/sell/outright.jpg"),
  },
  {
    href: "/sell/list-for-rent",
    labelKey: "sell.hub.listForRent",
    subKey: "sell.hub.listForRentSub",
    image: require("../../assets/sell/rent.jpg"),
  },
  {
    href: "/sell/trade-in",
    labelKey: "sell.hub.tradeIn",
    subKey: "sell.hub.tradeInSub",
    image: require("../../assets/sell/tradein.jpg"),
  },
] as const;

export default function SellScreen(): JSX.Element {
  const router = useRouter();
  const t = useT();
  const { palette } = useTheme();
  const scrollHandler = useTabBarScrollHandler();
  const insets = useSafeAreaInsets();
  const display = useDisplay();
  const track = useTracking();
  const user = useAuth((s) => s.user);

  // Selling / listing / trade-in are all account-bound — wall the whole hub to
  // sign-in for guests (GuestGate keeps a "browse" escape, Apple 5.1.1(v)).
  if (!user) return <GuestGate />;

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <TWAurora variant="ambient" />
      <Animated.ScrollView
        style={[styles.container, { backgroundColor: "transparent" }]}
        contentContainerStyle={styles.scrollContent}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <Text style={[styles.title, display(0.3), { color: palette.text }]}>
            {t("sell.hub.title")}
          </Text>
          <Text style={[styles.subtitle, { color: palette.muted }]}>{t("sell.hub.subtitle")}</Text>
        </View>

        {/* Hero card + a 2-up row so the three paths don't stack into one
            tall column ("not all on top of each other"). */}
        <View style={styles.cards}>
          <Animated.View entering={FadeInDown.duration(360)}>
            <HubCard
              imageUri={HUB_PATHS[0].image}
              label={t(HUB_PATHS[0].labelKey)}
              sub={t(HUB_PATHS[0].subKey)}
              onPress={() => router.push(HUB_PATHS[0].href as never)}
            />
          </Animated.View>
          <View style={styles.cardsRow}>
            {HUB_PATHS.slice(1).map((p, i) => (
              <Animated.View
                key={p.href}
                style={{ flex: 1 }}
                entering={FadeInDown.delay((i + 1) * 60).duration(360)}
              >
                <HubCard
                  compact
                  imageUri={p.image}
                  label={t(p.labelKey)}
                  sub={t(p.subKey)}
                  onPress={() => router.push(p.href as never)}
                />
              </Animated.View>
            ))}
          </View>
        </View>

        <View style={styles.footer}>
          <Text
            style={[
              styles.footerLink,
              { letterSpacing: track(0.4), color: colors.brand.friendlyBlue },
            ]}
            onPress={() => router.push("/sell/category/all" as never)}
          >
            {t("sell.hub.browseMarketplace")}
          </Text>
        </View>

        {/* How-selling-works — fills the space below the hub cards with a clear,
            reassuring 3-step explainer (brand-colored step numbers). */}
        <View style={styles.how}>
          <Text style={[styles.howTitle, display(0), { color: palette.text }]}>
            {t("sell.hub.howTitle")}
          </Text>
          {[
            { n: "1", c: "#A9F453", title: t("sell.hub.step1Title"), sub: t("sell.hub.step1Sub") },
            { n: "2", c: "#00C7EA", title: t("sell.hub.step2Title"), sub: t("sell.hub.step2Sub") },
            { n: "3", c: "#FF0065", title: t("sell.hub.step3Title"), sub: t("sell.hub.step3Sub") },
          ].map((step) => (
            <View key={step.n} style={styles.stepRow}>
              <View style={[styles.stepNum, { backgroundColor: step.c }]}>
                <Text style={styles.stepNumText}>{step.n}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.stepTitle, { color: palette.text }]}>{step.title}</Text>
                <Text style={[styles.stepSub, { color: palette.muted }]}>{step.sub}</Text>
              </View>
            </View>
          ))}
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: TAB_BAR_SAFE_BOTTOM + 24 },
  how: { paddingHorizontal: spacing.lg, marginTop: spacing.xl, gap: spacing.md },
  howTitle: { fontSize: 22, fontWeight: "800", marginBottom: 4 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  stepNum: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumText: { fontSize: 16, fontWeight: "900", color: "#02011F" },
  stepTitle: { fontSize: 15, fontWeight: "700" },
  stepSub: { fontSize: 13, marginTop: 1 },
  header: { paddingTop: 60, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  title: { fontSize: 44, lineHeight: 46 },
  subtitle: { fontSize: 15, marginTop: 8 },
  cards: { paddingHorizontal: spacing.lg, gap: 14, marginTop: 8 },
  cardsRow: { flexDirection: "row", gap: 14 },
  footer: { paddingHorizontal: spacing.lg, marginTop: 28, alignItems: "center" },
  footerLink: { fontSize: 13, fontWeight: "700" },
});
