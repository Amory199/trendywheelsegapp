import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import * as React from "react";
import { Alert } from "react-native";

import BookScreen from "../../app/rent/book";
import { api } from "../../lib/api";

// The shared jest-setup mock returns { alert: jest.fn() }, but react-native's
// index re-exports Alert via `require(...Alert).default`, so without a default
// field Alert imported from "react-native" is undefined. Provide both shapes.
jest.mock("react-native/Libraries/Alert/Alert", () => {
  const alert = jest.fn();
  return { alert, default: { alert } };
});

jest.mock("../../lib/api", () => ({
  api: {
    getVehicle: jest.fn(),
    createBooking: jest.fn(),
  },
}));

jest.mock("expo-router", () => {
  const push = jest.fn();
  const replace = jest.fn();
  const back = jest.fn();
  return {
    __esModule: true,
    useRouter: () => ({ push, replace, back }),
    useLocalSearchParams: () => ({ vehicleId: "veh-123" }),
    __push: push,
    __replace: replace,
  };
});

// Auto-pick a date the moment the picker mounts so we can advance past step 0
// without simulating native date-picker UI.
jest.mock("@react-native-community/datetimepicker", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: function MockPicker({
      onChange,
      minimumDate,
    }: {
      onChange: (e: unknown, d?: Date) => void;
      minimumDate?: Date;
    }) {
      // The return-date picker is the one passed an explicit minimumDate (= the
      // pickup date the user just chose). The pickup-date picker is passed
      // minimumDate = today (a Date constructed inline in the source), but its
      // minimum date will be earlier than the explicit 2030-01-10 start we set
      // on the return picker. Distinguish by whether minimumDate is >= 2030.
      const isReturnPicker =
        !!minimumDate && minimumDate.getTime() >= new Date("2030-01-01").getTime();
      const picked = isReturnPicker
        ? new Date("2030-01-15T00:00:00Z")
        : new Date("2030-01-10T00:00:00Z");
      React.useEffect(() => {
        onChange({ type: "set" }, picked);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return null;
    },
  };
});

const expoRouter = jest.requireMock("expo-router") as {
  __push: jest.Mock;
  __replace: jest.Mock;
};

const mockVehicle = {
  id: "veh-123",
  name: "Test Car",
  dailyRate: 500,
};

function renderScreen(): ReturnType<typeof render> {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <BookScreen />
    </QueryClientProvider>,
  );
}

async function driveToConfirm(utils: ReturnType<typeof render>): Promise<void> {
  // Step 0: tap both date fields; mocked picker fires onChange immediately.
  await utils.findByText("Pickup Date");
  // Initially both date fields show "Tap to choose"; press the first.
  await waitFor(() => expect(utils.queryAllByText("Tap to choose").length).toBe(2));
  fireEvent.press(utils.getAllByText("Tap to choose")[0]);
  // After first pick, the second field still shows "Tap to choose"
  await waitFor(() => expect(utils.queryAllByText("Tap to choose").length).toBe(1));
  fireEvent.press(utils.getByText("Tap to choose"));
  await waitFor(() => expect(utils.queryByText("Tap to choose")).toBeNull());
  fireEvent.press(utils.getByText("Continue"));

  // Step 1: fill the four fields, then Continue.
  fireEvent.changeText(utils.getByPlaceholderText("Ahmed Mohamed"), "Test User");
  fireEvent.changeText(utils.getByPlaceholderText("you@email.com"), "t@example.com");
  fireEvent.changeText(utils.getByPlaceholderText("+20 1xx xxx xxxx"), "+201234567890");
  fireEvent.changeText(utils.getByPlaceholderText("License number"), "LIC-1");
  fireEvent.press(utils.getByText("Continue"));

  // Step 2: press Confirm Booking.
  fireEvent.press(await utils.findByText("Confirm Booking"));
}

describe("Booking flow", () => {
  let getVehicleMock: jest.Mock;
  let createBookingMock: jest.Mock;

  beforeEach(() => {
    getVehicleMock = api.getVehicle as unknown as jest.Mock;
    createBookingMock = api.createBooking as unknown as jest.Mock;
    getVehicleMock.mockReset();
    createBookingMock.mockReset();
    getVehicleMock.mockResolvedValue({ data: mockVehicle });
    expoRouter.__push.mockReset();
    expoRouter.__replace.mockReset();
  });

  it("renders the success screen with the returned bookingRef on mutation success", async () => {
    createBookingMock.mockResolvedValue({ data: { id: "BK-XYZ-789" } });

    const utils = renderScreen();
    await driveToConfirm(utils);

    await waitFor(() => {
      expect(utils.getByText("Ref: BK-XYZ-789")).toBeTruthy();
    });
  });

  it("calls Alert.alert with 'Booking failed' title and the error message on mutation error", async () => {
    createBookingMock.mockRejectedValue(new Error("vehicle unavailable"));
    const alertMock = Alert.alert as unknown as jest.Mock;

    const utils = renderScreen();
    await driveToConfirm(utils);

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith("Booking failed", "vehicle unavailable");
    });
  });

  it("does NOT auto-redirect to /(tabs)/profile on mutation error", async () => {
    createBookingMock.mockRejectedValue(new Error("nope"));

    const utils = renderScreen();
    await driveToConfirm(utils);

    await waitFor(() => {
      expect(createBookingMock).toHaveBeenCalled();
    });
    expect(expoRouter.__replace).not.toHaveBeenCalledWith("/(tabs)/profile");
    expect(expoRouter.__push).not.toHaveBeenCalledWith("/(tabs)/profile");
  });

  it("posts to createBooking with vehicleId and ISO start/end dates", async () => {
    createBookingMock.mockResolvedValue({ data: { id: "BK-1" } });

    const utils = renderScreen();
    await driveToConfirm(utils);

    await waitFor(() => {
      expect(createBookingMock).toHaveBeenCalledWith({
        vehicleId: "veh-123",
        startDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        endDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      });
    });
  });
});
