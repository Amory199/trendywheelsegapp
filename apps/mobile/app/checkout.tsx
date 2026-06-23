import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { colors, twEGP } from "@trendywheels/ui-tokens";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";

import {
  FulfillmentPicker,
  optionNeedsLocation,
  type FulfillmentValue,
} from "../components/FulfillmentPicker";
import { GuestGate } from "../components/GuestGate";
import { logEvent } from "../lib/analytics";
import { api } from "../lib/api";
import { reportClientError } from "../lib/error-reporter";
import { useAuth } from "../lib/auth-store";
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
    onSuccess: () => {
      Alert.alert(
        t(kind === "buy" ? "buy.orderPlacedTitle" : "sale.reservedTitle"),
        t(kind === "buy" ? "buy.orderPlacedNoId" : "sale.reservedBody"),
      );
      router.replace(kind === "buy" ? "/buy/my-orders" : "/sale/my-reservations");
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
        err instanceof Error ? err.message : "",
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
