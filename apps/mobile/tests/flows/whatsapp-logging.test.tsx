import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import * as React from "react";
import { Linking } from "react-native";
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";

import LeadDetail from "../../app/crm/leads/[id]";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-store";

// Override the global expo-router mock to supply the lead id this screen
// reads via useLocalSearchParams. push/replace/back stay as jest.fns so
// the back-button render path doesn't blow up.
jest.mock("expo-router", () => {
  const push = jest.fn();
  const replace = jest.fn();
  const back = jest.fn();
  return {
    __esModule: true,
    useRouter: () => ({ push, replace, back }),
    useLocalSearchParams: () => ({ id: "lead-1" }),
  };
});

jest.mock("../../lib/api", () => ({
  api: {
    crmLead: jest.fn(),
    crmLogActivity: jest.fn(),
    crmRules: jest.fn(),
    crmInventory: jest.fn(),
    adminListUsers: jest.fn(),
    crmUpdateLead: jest.fn(),
    crmRotateLead: jest.fn(),
    crmReassignLead: jest.fn(),
    crmAttachVehicle: jest.fn(),
  },
}));

jest.mock("../../lib/sounds", () => ({ playSound: jest.fn() }));

// expo-audio is not stubbed in jest-setup; mock it explicitly so the lib/sounds
// module — which dereferences a native binding at import time — doesn't crash
// the suite when its eager `import { createAudioPlayer } from "expo-audio"` runs.
jest.mock("expo-audio", () => ({
  createAudioPlayer: jest.fn(() => ({ play: jest.fn(), seekTo: jest.fn() })),
}));

// react-native's top-level Linking/Alert getters resolve `require(...).default`,
// but the global jest-setup mocks return flat objects — so the source's
// `Linking.openURL` and `Alert.alert` resolve to `undefined.<method>`. Re-mock
// with the `__esModule` + `default` shape so the same singleton spies the source
// invokes are what we assert on below.
jest.mock("react-native/Libraries/Linking/Linking", () => {
  const openURL = jest.fn(() => Promise.resolve());
  return {
    __esModule: true,
    default: {
      openURL,
      canOpenURL: jest.fn(() => Promise.resolve(true)),
      addEventListener: jest.fn(),
    },
  };
});
jest.mock("react-native/Libraries/Alert/Alert", () => ({
  __esModule: true,
  default: { alert: jest.fn() },
}));

const mockLead = {
  id: "lead-1",
  contactName: "Jane Doe",
  contactPhone: "+201234567890",
  status: "new",
  estimatedValue: 50000,
  callCount: 0,
  messageCount: 0,
  lastCallAt: null,
  lastMessageAt: null,
  activities: [],
  vehicles: [],
  ownerId: "agent-1",
  assignedAgentId: "agent-1",
};

function renderScreen(): ReturnType<typeof render> {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <SafeAreaProvider
      initialMetrics={
        initialWindowMetrics ?? {
          frame: { x: 0, y: 0, width: 0, height: 0 },
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
        }
      }
    >
      <QueryClientProvider client={client}>
        <LeadDetail />
      </QueryClientProvider>
    </SafeAreaProvider>,
  );
}

describe("Lead detail · WA + Call activity logging", () => {
  beforeEach(() => {
    // Sales agent — not admin — so the lead loads its action row.
    useAuth.setState({
      user: { id: "agent-1", accountType: "sales", preferences: { theme: "light" } } as never,
    });
    (api.crmLead as jest.Mock).mockResolvedValue({ data: mockLead });
    (api.crmRules as jest.Mock).mockResolvedValue({ data: {} });
    (Linking.openURL as jest.Mock).mockClear();
  });

  it("tapping WA button calls logActivity.mutateAsync with type whatsapp_sent", async () => {
    (api.crmLogActivity as jest.Mock).mockResolvedValue({ data: { id: "act-1" } });

    const { findByText } = renderScreen();
    const waBtn = await findByText("WA");
    fireEvent.press(waBtn);

    await waitFor(() => {
      expect(api.crmLogActivity).toHaveBeenCalledWith(
        "lead-1",
        expect.objectContaining({ type: "whatsapp_sent" }),
      );
    });
  });

  it("still opens WhatsApp when the activity log throws (logging failure doesn't block)", async () => {
    (api.crmLogActivity as jest.Mock).mockRejectedValue(new Error("network down"));

    const { findByText } = renderScreen();
    const waBtn = await findByText("WA");
    fireEvent.press(waBtn);

    await waitFor(() => {
      expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining("wa.me/201234567890"));
    });
  });

  it("Call button logs call_attempted then opens tel: even if logging fails (same swallow pattern)", async () => {
    (api.crmLogActivity as jest.Mock).mockRejectedValue(new Error("offline"));

    const { findByText } = renderScreen();
    const callBtn = await findByText("Call");
    fireEvent.press(callBtn);

    await waitFor(() => {
      expect(api.crmLogActivity).toHaveBeenCalledWith(
        "lead-1",
        expect.objectContaining({ type: "call_attempted" }),
      );
    });
    await waitFor(() => {
      expect(Linking.openURL).toHaveBeenCalledWith("tel:+201234567890");
    });
  });
});
