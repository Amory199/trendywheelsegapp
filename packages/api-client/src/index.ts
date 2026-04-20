import type {
  ApiResponse,
  AuthTokens,
  Booking,
  BookingFilters,
  LoginResponse,
  PaginatedResponse,
  User,
  Vehicle,
  VehicleFilters,
} from "@trendywheels/types";

type TokenProvider = () => Promise<string | null>;
type TokenRefresher = (refreshToken: string) => Promise<AuthTokens>;

interface ClientConfig {
  baseUrl: string;
  getAccessToken: TokenProvider;
  getRefreshToken: TokenProvider;
  onTokenRefresh: (tokens: AuthTokens) => Promise<void>;
  refreshTokens: TokenRefresher;
}

class ApiClient {
  private config: ClientConfig;

  constructor(config: ClientConfig) {
    this.config = config;
  }

  private async request<T>(
    method: string,
    path: string,
    options?: { body?: unknown; params?: Record<string, string | number | boolean | undefined> },
  ): Promise<T> {
    const url = new URL(`${this.config.baseUrl}${path}`);
    if (options?.params) {
      Object.entries(options.params).forEach(([key, val]) => {
        if (val !== undefined) url.searchParams.set(key, String(val));
      });
    }

    const token = await this.config.getAccessToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    let response = await fetch(url.toString(), {
      method,
      headers,
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });

    // Token refresh on 401
    if (response.status === 401) {
      const refreshToken = await this.config.getRefreshToken();
      if (refreshToken) {
        const newTokens = await this.config.refreshTokens(refreshToken);
        await this.config.onTokenRefresh(newTokens);
        headers["Authorization"] = `Bearer ${newTokens.token}`;
        response = await fetch(url.toString(), {
          method,
          headers,
          body: options?.body ? JSON.stringify(options.body) : undefined,
        });
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Request failed" }));
      throw new ApiClientError(
        error.message || "Request failed",
        response.status,
        error.code || "UNKNOWN",
      );
    }

    return response.json() as Promise<T>;
  }

  // ─── Auth ────────────────────────────────────────────────

  async sendOtp(phone: string): Promise<{ success: boolean; message: string }> {
    return this.request("POST", "/api/auth/send-otp", { body: { phone } });
  }

  async verifyOtp(phone: string, otp: string): Promise<LoginResponse> {
    return this.request("POST", "/api/auth/verify-otp", { body: { phone, otp } });
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    return this.request("POST", "/api/auth/refresh-token", { body: { refreshToken } });
  }

  async logout(): Promise<{ success: boolean }> {
    return this.request("POST", "/api/auth/logout");
  }

  // ─── Vehicles ────────────────────────────────────────────

  async getVehicles(filters?: VehicleFilters): Promise<PaginatedResponse<Vehicle>> {
    return this.request("GET", "/api/vehicles", { params: filters as Record<string, string> });
  }

  async getVehicle(id: string): Promise<ApiResponse<Vehicle>> {
    return this.request("GET", `/api/vehicles/${encodeURIComponent(id)}`);
  }

  // ─── Bookings ────────────────────────────────────────────

  async getBookings(filters?: BookingFilters): Promise<PaginatedResponse<Booking>> {
    return this.request("GET", "/api/bookings", { params: filters as Record<string, string> });
  }

  async createBooking(data: {
    vehicleId: string;
    startDate: string;
    endDate: string;
  }): Promise<ApiResponse<Booking>> {
    return this.request("POST", "/api/bookings", { body: data });
  }

  async updateBooking(
    id: string,
    data: Partial<Pick<Booking, "status" | "startDate" | "endDate">>,
  ): Promise<ApiResponse<Booking>> {
    return this.request("PUT", `/api/bookings/${encodeURIComponent(id)}`, { body: data });
  }

  // ─── Users ───────────────────────────────────────────────

  async getUser(id: string): Promise<ApiResponse<User>> {
    return this.request("GET", `/api/users/${encodeURIComponent(id)}`);
  }

  async updateUser(id: string, data: Partial<User>): Promise<ApiResponse<User>> {
    return this.request("PUT", `/api/users/${encodeURIComponent(id)}`, { body: data });
  }

  // ─── Upload ──────────────────────────────────────────────

  async getUploadUrl(
    filename: string,
    contentType: string,
  ): Promise<{ uploadUrl: string; fileUrl: string; key: string }> {
    return this.request("POST", "/api/upload", { body: { filename, contentType } });
  }
}

export class ApiClientError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

export { ApiClient };
export type { ClientConfig };
