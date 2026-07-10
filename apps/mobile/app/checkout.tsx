import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { colors, twEGP } from "@trendywheels/ui-tokens";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";

import {
  FulfillmentPicker,
  optionNeedsLocation,
  type FulfillmentValue,
} from "../components/FulfillmentPicker";
import { GuestGate } from "../components/GuestGate";
import { TWSkiaConfetti } from "../components/skia/confetti";
import { logEvent } from "../lib/analytics";
import { api } from "../lib/api";
import { reportClientError } from "../lib/error-reporter";
import { useAuth } from "../lib/auth-store";
import { openContextChat } from "../lib/context-chat";
import { useHumanizeError } from "../lib/humanize-error";
import { useT } from "../lib/locale";
import { ensureId } from "../lib/require-id";
import { useTheme } from "../lib/use-theme";

// Guided checkout for the buy-side money-in flows (Reserve a for-sale vehicle,
// Buy a product). The detail screen routes here after the customer taps the CTA
// — so the ID + fulfillment + location steps live in one place instead of being
// crammed onto the product page. Rent/Sell/Trade-in embed the same
// FulfillmentPicker inside their own existing forms.
export default function CheckoutScreen(): React.JSX.Element {
  const router = useRouter();
  const t = useT();
  const humanize = useHumanizeError();
  const { palette } = useTheme();
  const user = useAuth((s) => s.user);
  const params = useLocalSearchParams<{
    kind: "reserve" | "buy";
    id: string;
    title?: string;
    price?: string;
  }>();
  const kind = params.kind === "buy" ? "buy" : "reserve";
  const id = params.id as string;
  const price = params.price ? Number(params.price) : null;

  const [fulfillment, setFulfillment] = React.useState<FulfillmentValue>({
    type: null,
    location: "",
  });
  // Set after a successful reserve/buy — swaps the screen for the celebration
  // (confetti + QR pass) instead of the old bare system Alert.
  const [doneId, setDoneId] = React.useState<string | null>(null);

  // Every transaction needs the customer's ID on file first. If it's missing,
  // bounce to verify-id and come back to this exact checkout afterwards.
  React.useEffect(() => {
    if (user) ensureId(user, router, "/checkout", params as Record<string, string>);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const submit = useMutation({
    mutationFn: async () => {
      const dropoffLocationUrl = optionNeedsLocation(fulfillment.type)
        ? fulfillment.location.trim() || null
        : null;
      logEvent("checkout_confirm", { kind, fulfillment: fulfillment.type ?? "none" });
      if (kind === "buy") {
        return api.request<{ data: { id: string } }>("POST", "/api/orders", {
          body: {
            items: [{ productId: id, quantity: 1 }],
            dropoffLocationUrl,
            fulfillmentType: fulfillment.type,
          },
        });
      }
      return api.createReservation({
        vehicleId: id,
        dropoffLocationUrl,
        fulfillmentType: fulfillment.type,
      });
    },
    onSuccess: (res) => {
      // Swap to the in-screen celebration (confetti + QR pass) — the old bare
      // Alert undersold the biggest transaction in the app. Buttons on the
      // celebration own the navigation, so no Alert/replace race either.
      setDoneId((res as { data?: { id?: string } }).data?.id ?? "");
    },
    onError: (err) => {
      // Report money-path failures (even though they're handled with an alert)
      // so campaign-time checkout problems are visible in Sentry + the error log.
      reportClientError({
        level: "error",
        message: `checkout failed (${kind}): ${err instanceof Error ? err.message : String(err)}`,
        stack: err instanceof Error ? err.stack : undefined,
        route: "/checkout",
        metadata: { kind, fulfillmentType: fulfillment.type, vehicleOrProductId: id },
      });
      Alert.alert(
        t(kind === "buy" ? "buy.couldNotPlaceTitle" : "sale.reserveFailedTitle"),
        humanize(err),
      );
    },
  });

  const onConfirm = (): void => {
    if (!fulfillment.type) {
      Alert.alert("", t("fulfillment.chooseOne"));
      return;
    }
    if (optionNeedsLocation(fulfillment.type) && !fulfillment.location.trim()) {
      Alert.alert("", t("fulfillment.locationRequired"));
      return;
    }
    submit.mutate();
  };

  if (!user) return <GuestGate />;

  if (doneId !== null) {
    const shortCode = doneId ? `TW-${doneId.replace(/-/g, "").slice(0, 6).toUpperCase()}` : "";
    const dest = kind === "buy" ? "/buy/my-orders" : "/sale/my-reservations";
    return (
      <View style={{ flex: 1, backgroundColor: palette.bg, justifyContent: "center", padding: 24 }}>
        <TWSkiaConfetti count={80} />
        <View
          style={{
            backgroundColor: palette.card,
            borderRadius: 20,
            padding: 24,
            alignItems: "center",
            gap: 14,
            borderWidth: 1,
            borderColor: palette.border,
          }}
        >
          <Ionicons name="checkmark-circle" size={80} color={colors.success} />
          <Text style={{ color: palette.text, fontSize: 24, fontWeight: "800" }}>
            {t(kind === "buy" ? "buy.orderPlacedTitle" : "sale.reservedTitle")}
          </Text>
          {doneId ? (
            <View style={{ backgroundColor: "#fff", padding: 14, borderRadius: 14 }}>
              <QRCode value={doneId} size={140} backgroundColor="transparent" />
            </View>
          ) : null}
          {shortCode ? (
            <Text style={{ color: colors.accent.DEFAULT, fontSize: 15, fontWeight: "700" }}>
              {shortCode}
            </Text>
          ) : null}
          <Text style={{ color: palette.muted, textAlign: "center", lineHeight: 21 }}>
            {t(kind === "buy" ? "buy.orderPlacedNoId" : "sale.reservedBody")}
          </Text>
          <Pressable
            style={{
              backgroundColor: colors.accent.DEFAULT,
              borderRadius: 12,
              height: 50,
              width: "100%",
              justifyContent: "center",
              alignItems: "center",
            }}
            onPress={() => {
              // Wipe the purchase flow off the stack so back lands on Home.
              if (router.canDismiss()) router.dismissAll();
              router.push(dest as never);
            }}
          >
            <Text style={{ color: "#000", fontWeight: "800" }}>
              {t(kind === "buy" ? "buy.viewMyOrders" : "sale.viewMyReservations")}
            </Text>
          </Pressable>
          {doneId && kind === "reserve" ? (
            <Pressable
              style={{
                borderRadius: 12,
                height: 50,
                width: "100%",
                justifyContent: "center",
                alignItems: "center",
                borderWidth: 1,
                borderColor: palette.border,
                flexDirection: "row",
                gap: 6,
              }}
              onPress={() =>
                void openContextChat(router, {
                  contextType: "reservation",
                  contextId: doneId,
                  contextTitle: `${params.title ?? ""} · ${shortCode}`.trim(),
                })
              }
            >
              <Ionicons name="chatbubble-outline" size={16} color={palette.text} />
              <Text style={{ color: palette.text, fontWeight: "700" }}>{t("rent.messageUs")}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t(kind === "buy" ? "buy.buyNow" : "sale.reserveCta"),
          headerStyle: { backgroundColor: palette.bg },
          headerTitleStyle: { color: palette.text },
          headerTintColor: palette.text,
        }}
      />
      <View style={{ flex: 1, backgroundColor: palette.bg }}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140, gap: 18 }}>
          {params.title ? (
            <View
              style={{
                backgroundColor: palette.card,
                borderRadius: 14,
                padding: 16,
                borderWidth: 1,
                borderColor: palette.border,
                gap: 4,
              }}
            >
              <Text style={{ color: palette.muted, fontSize: 12, fontWeight: "700" }}>
                {t(kind === "buy" ? "buy.buyNow" : "sale.forSale")}
              </Text>
              <Text style={{ color: palette.text, fontSize: 17, fontWeight: "800" }}>
                {params.title}
              </Text>
              {price != null ? (
                <Text style={{ color: colors.brand.trendyPink, fontSize: 18, fontWeight: "800" }}>
                  {twEGP(price)}
                </Text>
              ) : null}
            </View>
          ) : null}

          <FulfillmentPicker side="buy" value={fulfillment} onChange={setFulfillment} />
        </ScrollView>

        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: 16,
            paddingBottom: 30,
            backgroundColor: palette.card,
            borderTopWidth: 1,
            borderTopColor: palette.border,
          }}
        >
          <Pressable
            onPress={onConfirm}
            disabled={submit.isPending}
            style={{
              backgroundColor: colors.brand.trendyPink,
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
              opacity: submit.isPending ? 0.6 : 1,
            }}
          >
            {submit.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={{ color: "#fff", fontSize: 16, fontWeight: "800" }}>
                  {t("fulfillment.confirm")}
                </Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </>
            )}
          </Pressable>
        </View>
      </View>
    </>
  );
}
