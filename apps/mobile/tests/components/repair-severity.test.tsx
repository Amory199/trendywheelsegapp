import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import * as React from "react";

import RepairRequestScreen from "../../app/repair/request";
import { api } from "../../lib/api";

jest.mock("../../lib/api", () => ({
  api: { createRepairRequest: jest.fn() },
}));

jest.mock("../../lib/sounds", () => ({
  playSound: jest.fn(),
}));

// Avoid pulling the native DateTimePicker module — the picker is rendered
// only after a user tap, so stubbing to null is safe for these tests.
jest.mock("@react-native-community/datetimepicker", () => () => null);

function renderScreen(): ReturnType<typeof render> {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <RepairRequestScreen />
    </QueryClientProvider>,
  );
}

describe("Repair severity selector", () => {
  let createMock: jest.Mock;

  beforeEach(() => {
    createMock = api.createRepairRequest as unknown as jest.Mock;
    createMock.mockReset();
    createMock.mockResolvedValue({ data: { id: "rr-1" } });
  });

  it.each([
    ["Low", "low"],
    ["Medium", "medium"],
    ["High", "high"],
    ["Urgent", "urgent"],
  ])("tapping %s selects priority %s and submits it", async (label, key) => {
    const { getByText, getByPlaceholderText } = renderScreen();

    fireEvent.changeText(
      getByPlaceholderText(/Describe what's wrong in detail/i),
      "Engine is making a strange noise",
    );
    fireEvent.press(getByText(label));
    fireEvent.press(getByText("Submit Request"));

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledWith(expect.objectContaining({ priority: key }));
    });
  });

  it("gives the selected priority a distinct backgroundColor vs unselected", () => {
    const { getByText } = renderScreen();

    // Default selection is "medium". Switch to "High" so we can compare
    // a freshly-selected button against an unselected sibling ("Low").
    fireEvent.press(getByText("High"));

    const flatten = (s: unknown): Record<string, unknown> =>
      Array.isArray(s)
        ? Object.assign({}, ...s.map(flatten))
        : ((s as Record<string, unknown>) ?? {});

    // Walk up from the Text element to the Pressable (priorityBtn). The
    // Pressable carries the borderColor style, which acts as our marker —
    // intermediate wrapper Views from RNTL/Pressable internals do not.
    const findPriorityBtn = (
      node: ReturnType<typeof getByText> | null,
    ): Record<string, unknown> => {
      let cur: typeof node = node;
      while (cur) {
        const style = flatten(cur.props?.style);
        if (style.borderColor !== undefined) return style;
        cur = cur.parent as typeof node;
      }
      return {};
    };

    const highStyle = findPriorityBtn(getByText("High"));
    const lowStyle = findPriorityBtn(getByText("Low"));

    expect(highStyle.backgroundColor).toBeDefined();
    expect(highStyle.backgroundColor).not.toBe(lowStyle.backgroundColor);
  });
});
