import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import React from "react";

import TradeInScreen from "../../app/sell/trade-in";
import { api } from "../../lib/api";

jest.mock("../../lib/api", () => ({
  api: {
    submitTradeIn: jest.fn(),
  },
}));

jest.mock("../../lib/upload", () => ({
  uploadImages: jest.fn((uris: string[]) => Promise.resolve(uris.map((u) => `https://cdn/${u}`))),
}));

const wrap = (ui: React.ReactElement): React.ReactElement => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{ui}</QueryClientProvider>;
};

// Fills step 0 (vehicle info) and advances to step 1 (photos).
const advanceToPhotos = (): void => {
  fireEvent.changeText(screen.getByPlaceholderText("Club Car / E-Z-GO …"), "Club Car");
  fireEvent.changeText(screen.getByPlaceholderText("Onward 4P …"), "Onward 4P");
  fireEvent.changeText(screen.getByPlaceholderText("2022"), "2023");
  fireEvent.press(screen.getByText(/Next/));
};

// TODO: rewrite UNSAFE_getAllByType(Pressable) queries to use testID. The
// type-based query stopped finding the photo grid Pressables under RN 0.81.
describe.skip("TradeInScreen", () => {
  it("caps the photo grid at 6 images", async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: Array.from({ length: 8 }, (_, i) => ({ uri: `file:///p${i}.jpg` })),
    });

    render(wrap(<TradeInScreen />));
    advanceToPhotos();

    // The "+" tile is the only Pressable in the photo grid pre-pick.
    // Trigger the picker via the add tile.
    const addTiles = screen.UNSAFE_getAllByType(require("react-native").Pressable);
    // The last pressable inside the body is the add-photo tile; press it.
    // Press the add tile by finding the only one with the add icon present is brittle;
    // instead just press all that surface the picker. Simpler: call pick via add icon name.
    fireEvent.press(addTiles[addTiles.length - 2]); // -1 is footer submit button

    // Wait until photos are flushed to state and the grid clamps at 6.
    // At that point the add-tile Pressable is removed (length === 6), so
    // pressables = back + 6 remove buttons + footer = 8.
    await waitFor(() => {
      expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
      expect(screen.UNSAFE_getAllByType(require("react-native").Pressable).length).toBe(8);
    });

    // Advance to review step and assert "6 attached".
    fireEvent.press(screen.getByText(/Next/));
    expect(screen.getByText("6 attached")).toBeTruthy();
  });

  it("keeps user on step 1 when trying to advance without any photos", async () => {
    render(wrap(<TradeInScreen />));
    advanceToPhotos();

    // Now on step 1. The footer button should be "Next →" but disabled because canProceed1 false.
    fireEvent.press(screen.getByText(/Next/));

    // Still on the photos step — header says "STEP 2 OF 3".
    expect(screen.getByText("TRADE-IN · STEP 2 OF 3")).toBeTruthy();
    // Review-only label "attached" should NOT appear.
    expect(screen.queryByText(/attached/)).toBeNull();
  });

  it("posts trade-in payload to api.submitTradeIn on submit", async () => {
    (api.submitTradeIn as jest.Mock).mockResolvedValueOnce({ id: "trade_1" });
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: "file:///photo.jpg" }],
    });

    render(wrap(<TradeInScreen />));
    advanceToPhotos();

    // Press the add-photo tile.
    const pressables = screen.UNSAFE_getAllByType(require("react-native").Pressable);
    fireEvent.press(pressables[pressables.length - 2]);
    // Wait until photo state propagates: 1 photo -> back + remove + add + footer = 4.
    await waitFor(() => {
      expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
      expect(screen.UNSAFE_getAllByType(require("react-native").Pressable).length).toBe(4);
    });

    // Advance to review.
    fireEvent.press(screen.getByText(/Next/));
    // Submit.
    fireEvent.press(screen.getByText(/Submit trade-in/));

    await waitFor(() => expect(api.submitTradeIn).toHaveBeenCalledTimes(1));
    expect(api.submitTradeIn).toHaveBeenCalledWith(
      expect.objectContaining({
        brand: "Club Car",
        model: "Onward 4P",
        year: 2023,
        condition: "good",
        photos: ["https://cdn/file:///photo.jpg"],
      }),
    );
  });

  it("shows the success Alert after a successful submission", async () => {
    (api.submitTradeIn as jest.Mock).mockResolvedValueOnce({ id: "trade_2" });
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: "file:///x.jpg" }],
    });

    render(wrap(<TradeInScreen />));
    advanceToPhotos();

    const pressables = screen.UNSAFE_getAllByType(require("react-native").Pressable);
    fireEvent.press(pressables[pressables.length - 2]);
    // Wait until photo state propagates: 1 photo -> back + remove + add + footer = 4.
    await waitFor(() => {
      expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
      expect(screen.UNSAFE_getAllByType(require("react-native").Pressable).length).toBe(4);
    });

    fireEvent.press(screen.getByText(/Next/));
    fireEvent.press(screen.getByText(/Submit trade-in/));

    await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
    expect((Alert.alert as jest.Mock).mock.calls[0][0]).toBe("Trade-in submitted");
  });
});
