import type {
  ApiResponse,
  AuthTokens,
  Booking,
  BookingFilters,
  LoginResponse,
  Message,
  Notification,
  PaginatedResponse,
  RepairRequest,
  SalesListing,
  SupportTicket,
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

interface PaginationParams {
  page?: number;
  limit?: number;
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
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    let response = await fetch(url.toString(), {
      method,
      headers,
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });

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
        (error as { message?: string }).message || "Request failed",
        response.status,
        (error as { code?: string }).code || "UNKNOWN",
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

  async getVehicles(filters?: VehicleFilters & PaginationParams): Promise<PaginatedResponse<Vehicle>> {
    return this.request("GET", "/api/vehicles", { params: filters as Record<string, string | number | boolean | undefined> });
  }

  async getVehicle(id: string): Promise<ApiResponse<Vehicle>> {
    return this.request("GET", `/api/vehicles/${encodeURIComponent(id)}`);
  }

  async createVehicle(data: Partial<Vehicle>): Promise<ApiResponse<Vehicle>> {
    return this.request("POST", "/api/vehicles", { body: data });
  }

  async updateVehicle(id: string, data: Partial<Vehicle>): Promise<ApiResponse<Vehicle>> {
    return this.request("PUT", `/api/vehicles/${encodeURIComponent(id)}`, { body: data });
  }

  async deleteVehicle(id: string): Promise<{ success: boolean }> {
    return this.request("DELETE", `/api/vehicles/${encodeURIComponent(id)}`);
  }

  // ─── Bookings ────────────────────────────────────────────

  async getBookings(filters?: BookingFilters & PaginationParams): Promise<PaginatedResponse<Booking>> {
    return this.request("GET", "/api/bookings", { params: filters as Record<string, string | number | boolean | undefined> });
  }

  async createBooking(data: { vehicleId: string; startDate: string; endDate: string }): Promise<ApiResponse<Booking>> {
    return this.request("POST", "/api/bookings", { body: data });
  }

  async updateBooking(id: string, data: Partial<Pick<Booking, "status" | "startDate" | "endDate">>): Promise<ApiResponse<Booking>> {
    return this.request("PUT", `/api/bookings/${encodeURIComponent(id)}`, { body: data });
  }

  // ─── Users ───────────────────────────────────────────────

  async getCurrentUser(): Promise<ApiResponse<User>> {
    return this.request("GET", "/api/users/me");
  }

  async getUser(id: string): Promise<ApiResponse<User>> {
    return this.request("GET", `/api/users/${encodeURIComponent(id)}`);
  }

  async updateUser(id: string, data: Partial<User>): Promise<ApiResponse<User>> {
    return this.request("PUT", `/api/users/${encodeURIComponent(id)}`, { body: data });
  }

  async getUserInteractions(id: string, params?: PaginationParams & { type?: string }): Promise<PaginatedResponse<unknown>> {
    return this.request("GET", `/api/users/${encodeURIComponent(id)}/interactions`, { params: params as Record<string, string | number | boolean | undefined> });
  }

  // ─── Sales Listings ──────────────────────────────────────

  async getSalesListings(params?: PaginationParams & { status?: string }): Promise<PaginatedResponse<SalesListing>> {
    return this.request("GET", "/api/sales", { params: params as Record<string, string | number | boolean | undefined> });
  }

  async getSalesListing(id: string): Promise<ApiResponse<SalesListing>> {
    return this.request("GET", `/api/sales/${encodeURIComponent(id)}`);
  }

  async createSalesListing(data: Partial<SalesListing>): Promise<ApiResponse<SalesListing>> {
    return this.request("POST", "/api/sales", { body: data });
  }

  async updateSalesListing(id: string, data: Partial<SalesListing>): Promise<ApiResponse<SalesListing>> {
    return this.request("PUT", `/api/sales/${encodeURIComponent(id)}`, { body: data });
  }

  async deleteSalesListing(id: string): Promise<{ success: boolean }> {
    return this.request("DELETE", `/api/sales/${encodeURIComponent(id)}`);
  }

  // ─── Repair Requests ─────────────────────────────────────

  async getRepairRequests(params?: PaginationParams & { status?: string }): Promise<PaginatedResponse<RepairRequest>> {
    return this.request("GET", "/api/repairs", { params: params as Record<string, string | number | boolean | undefined> });
  }

  async getRepairRequest(id: string): Promise<ApiResponse<RepairRequest>> {
    return this.request("GET", `/api/repairs/${encodeURIComponent(id)}`);
  }

  async createRepairRequest(data: Partial<RepairRequest>): Promise<ApiResponse<RepairRequest>> {
    return this.request("POST", "/api/repairs", { body: data });
  }

  async updateRepairRequest(id: string, data: Partial<RepairRequest>): Promise<ApiResponse<RepairRequest>> {
    return this.request("PUT", `/api/repairs/${encodeURIComponent(id)}`, { body: data });
  }

  async cancelRepairRequest(id: string): Promise<ApiResponse<RepairRequest>> {
    return this.request("POST", `/api/repairs/${encodeURIComponent(id)}/cancel`);
  }

  // ─── Messages ────────────────────────────────────────────

  async getConversations(): Promise<{ data: unknown[] }> {
    return this.request("GET", "/api/messages/conversations");
  }

  async getMessages(conversationId: string, params?: PaginationParams): Promise<PaginatedResponse<Message>> {
    return this.request("GET", `/api/messages/conversations/${encodeURIComponent(conversationId)}/messages`, {
      params: params as Record<string, string | number | boolean | undefined>,
    });
  }

  async sendMessage(recipientId: string, message: string, attachments?: string[]): Promise<ApiResponse<Message>> {
    return this.request("POST", "/api/messages", { body: { recipientId, message, attachments: attachments ?? [] } });
  }

  async markConversationRead(conversationId: string): Promise<{ success: boolean }> {
    return this.request("POST", `/api/messages/conversations/${encodeURIComponent(conversationId)}/read`);
  }

  // ─── Notifications ───────────────────────────────────────

  async getNotifications(): Promise<{ data: Notification[] }> {
    return this.request("GET", "/api/notifications");
  }

  async markNotificationRead(id: string): Promise<{ success: boolean }> {
    return this.request("POST", `/api/notifications/${encodeURIComponent(id)}/read`);
  }

  async markAllNotificationsRead(): Promise<{ success: boolean }> {
    return this.request("POST", "/api/notifications/read-all");
  }

  // ─── Support Tickets ─────────────────────────────────────

  async getTickets(params?: PaginationParams & { status?: string; priority?: string }): Promise<PaginatedResponse<SupportTicket>> {
    return this.request("GET", "/api/tickets", { params: params as Record<string, string | number | boolean | undefined> });
  }

  async getTicket(id: string): Promise<ApiResponse<SupportTicket>> {
    return this.request("GET", `/api/tickets/${encodeURIComponent(id)}`);
  }

  async createTicket(data: { subject: string; message: string; priority?: string }): Promise<ApiResponse<SupportTicket>> {
    return this.request("POST", "/api/tickets", { body: data });
  }

  async updateTicket(id: string, data: Partial<SupportTicket>): Promise<ApiResponse<SupportTicket>> {
    return this.request("PUT", `/api/tickets/${encodeURIComponent(id)}`, { body: data });
  }

  // ─── Storage ─────────────────────────────────────────────

  async getUploadUrl(mimeType: string, prefix = "uploads"): Promise<{ uploadUrl: string; fileUrl: string; key: string }> {
    return this.request("POST", "/api/storage/presign", { body: { mimeType, prefix } });
  }

  async deleteFile(key: string): Promise<{ success: boolean }> {
    return this.request("DELETE", `/api/storage/${encodeURIComponent(key)}`);
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
