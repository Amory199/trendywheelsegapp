import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import * as React from "react";
import { Alert } from "react-native";

import ProductDetailScreen from "../../app/buy/[id]";
import { api } from "../../lib/api";

jest.mock("../../lib/api", () => ({
  api: { request: jest.fn() },
}));

jest.mock("expo-router", () => {
  const push = jest.fn();
  const replace = jest.fn();
  const back = jest.fn();
  return {
    __esModule: true,
    useRouter: () => ({ push, replace, back }),
    useLocalSearchParams: () => ({ id: "prod-123" }),
    __push: push,
  };
});

const expoRouter = jest.requireMock("expo-router") as { __push: jest.Mock };

function renderScreen(): ReturnType<typeof render> {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ProductDetailScreen />
    </QueryClientProvider>,
  );
}

const mockProduct = {
  id: "prod-123",
  category: "accessory",
  name: "Test Product",
  description: "A thing",
  priceEgp: 1000,
  images: ["https://example.com/a.jpg"],
  inStock: true,
  brand: null,
  model: null,
  year: null,
};

describe("Buy flow", () => {
  let requestMock: jest.Mock;

  beforeEach(() => {
    requestMock = api.request as unknown as jest.Mock;
    requestMock.mockReset();
    expoRouter.__push.mockReset();
  });

  it("shows 'Order placed' alert on successful purchase", async () => {
    requestMock.mockImplementation((method: string, path: string) => {
      if (method === "GET" && path === "/api/products/prod-123") {
        return Promise.resolve({ data: mockProduct });
      }
      if (method === "POST" && path === "/api/orders") {
        return Promise.resolve({ data: { id: "order-abcdef123456" } });
      }
      return Promise.reject(new Error("unexpected"));
    });
    const alertSpy = jest.spyOn(Alert, "alert");

    const { findByText } = renderScreen();
    const buyBtn = await findByText("Buy now");
    fireEvent.press(buyBtn);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Order placed", expect.any(String), expect.any(Array));
    });
  });

  it("does NOT auto-route to /profile on success (only via Alert button)", async () => {
    requestMock.mockImplementation((method: string, path: string) => {
      if (method === "GET" && path === "/api/products/prod-123") {
        return Promise.resolve({ data: mockProduct });
      }
      return Promise.resolve({ data: { id: "order-xyz" } });
    });

    const { findByText } = renderScreen();
    const buyBtn = await findByText("Buy now");
    fireEvent.press(buyBtn);

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith("POST", "/api/orders", expect.any(Object));
    });
    expect(expoRouter.__push).not.toHaveBeenCalled();
  });

  it("shows 'Could not place order' alert when API errors", async () => {
    requestMock.mockImplementation((method: string, path: string) => {
      if (method === "GET" && path === "/api/products/prod-123") {
        return Promise.resolve({ data: mockProduct });
      }
      return Promise.reject(new Error("network down"));
    });
    const alertSpy = jest.spyOn(Alert, "alert");

    const { findByText } = renderScreen();
    const buyBtn = await findByText("Buy now");
    fireEvent.press(buyBtn);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Could not place order", expect.any(String));
    });
  });

  it("POSTs to /api/orders with productId + quantity 1", async () => {
    requestMock.mockImplementation((method: string, path: string) => {
      if (method === "GET" && path === "/api/products/prod-123") {
        return Promise.resolve({ data: mockProduct });
      }
      return Promise.resolve({ data: { id: "order-1" } });
    });

    const { findByText } = renderScreen();
    const buyBtn = await findByText("Buy now");
    fireEvent.press(buyBtn);

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith("POST", "/api/orders", {
        body: { items: [{ productId: "prod-123", quantity: 1 }] },
      });
    });
  });
});
