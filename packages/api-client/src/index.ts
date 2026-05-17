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

  async request<T>(
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

    const fetchWithTimeout = async (auth: string | undefined): Promise<Response> => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10_000);
      const reqHeaders = { ...headers };
      if (auth) reqHeaders["Authorization"] = auth;
      try {
        return await fetch(url.toString(), {
          method,
          headers: reqHeaders,
          body: options?.body ? JSON.stringify(options.body) : undefined,
          signal: controller.signal,
        });
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          throw new ApiClientError("Request timed out", 0, "TIMEOUT");
        }
        throw err;
      } finally {
        clearTimeout(timer);
      }
    };

    let response = await fetchWithTimeout(headers["Authorization"]);

    if (response.status === 401) {
      const refreshToken = await this.config.getRefreshToken();
      if (refreshToken) {
        const newTokens = await this.config.refreshTokens(refreshToken);
        await this.config.onTokenRefresh(newTokens);
        response = await fetchWithTimeout(`Bearer ${newTokens.token}`);
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

  async getVehicles(
    filters?: VehicleFilters & PaginationParams,
  ): Promise<PaginatedResponse<Vehicle>> {
    return this.request("GET", "/api/vehicles", {
      params: filters as Record<string, string | number | boolean | undefined>,
    });
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

  async getBookings(
    filters?: BookingFilters & PaginationParams,
  ): Promise<PaginatedResponse<Booking>> {
    return this.request("GET", "/api/bookings", {
      params: filters as Record<string, string | number | boolean | undefined>,
    });
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

  async getCurrentUser(): Promise<ApiResponse<User>> {
    return this.request("GET", "/api/users/me");
  }

  async getUser(id: string): Promise<ApiResponse<User>> {
    return this.request("GET", `/api/users/${encodeURIComponent(id)}`);
  }

  async updateUser(id: string, data: Partial<User>): Promise<ApiResponse<User>> {
    return this.request("PUT", `/api/users/${encodeURIComponent(id)}`, { body: data });
  }

  async getUserInteractions(
    id: string,
    params?: PaginationParams & { type?: string },
  ): Promise<PaginatedResponse<unknown>> {
    return this.request("GET", `/api/users/${encodeURIComponent(id)}/interactions`, {
      params: params as Record<string, string | number | boolean | undefined>,
    });
  }

  // ─── Sales Listings ──────────────────────────────────────

  async getSalesListings(
    params?: PaginationParams & { status?: string; category?: string },
  ): Promise<PaginatedResponse<SalesListing>> {
    return this.request("GET", "/api/sales", {
      params: params as Record<string, string | number | boolean | undefined>,
    });
  }

  async getSalesListing(id: string): Promise<ApiResponse<SalesListing>> {
    return this.request("GET", `/api/sales/${encodeURIComponent(id)}`);
  }

  async createSalesListing(data: Partial<SalesListing>): Promise<ApiResponse<SalesListing>> {
    return this.request("POST", "/api/sales", { body: data });
  }

  async updateSalesListing(
    id: string,
    data: Partial<SalesListing>,
  ): Promise<ApiResponse<SalesListing>> {
    return this.request("PUT", `/api/sales/${encodeURIComponent(id)}`, { body: data });
  }

  async deleteSalesListing(id: string): Promise<{ success: boolean }> {
    return this.request("DELETE", `/api/sales/${encodeURIComponent(id)}`);
  }

  // ─── Repair Requests ─────────────────────────────────────

  async getRepairRequests(
    params?: PaginationParams & { status?: string },
  ): Promise<PaginatedResponse<RepairRequest>> {
    return this.request("GET", "/api/repairs", {
      params: params as Record<string, string | number | boolean | undefined>,
    });
  }

  async getRepairRequest(id: string): Promise<ApiResponse<RepairRequest>> {
    return this.request("GET", `/api/repairs/${encodeURIComponent(id)}`);
  }

  async createRepairRequest(data: Partial<RepairRequest>): Promise<ApiResponse<RepairRequest>> {
    return this.request("POST", "/api/repairs", { body: data });
  }

  async updateRepairRequest(
    id: string,
    data: Partial<RepairRequest>,
  ): Promise<ApiResponse<RepairRequest>> {
    return this.request("PUT", `/api/repairs/${encodeURIComponent(id)}`, { body: data });
  }

  async cancelRepairRequest(id: string): Promise<ApiResponse<RepairRequest>> {
    return this.request("POST", `/api/repairs/${encodeURIComponent(id)}/cancel`);
  }

  // ─── Messages ────────────────────────────────────────────

  async getConversations(): Promise<{ data: unknown[] }> {
    return this.request("GET", "/api/messages/conversations");
  }

  async getMessages(
    conversationId: string,
    params?: PaginationParams,
  ): Promise<PaginatedResponse<Message>> {
    return this.request(
      "GET",
      `/api/messages/conversations/${encodeURIComponent(conversationId)}/messages`,
      {
        params: params as Record<string, string | number | boolean | undefined>,
      },
    );
  }

  async sendMessage(
    recipientId: string,
    message: string,
    attachments?: string[],
  ): Promise<ApiResponse<Message>> {
    return this.request("POST", "/api/messages", {
      body: { recipientId, message, attachments: attachments ?? [] },
    });
  }

  async markConversationRead(conversationId: string): Promise<{ success: boolean }> {
    return this.request(
      "POST",
      `/api/messages/conversations/${encodeURIComponent(conversationId)}/read`,
    );
  }

  async getSupportContact(): Promise<
    ApiResponse<{ id: string; name: string; avatarUrl: string | null }>
  > {
    return this.request("GET", "/api/messages/support-contact");
  }

  async createConversation(recipientId: string): Promise<ApiResponse<{ id: string }>> {
    return this.request("POST", "/api/messages/conversations", { body: { recipientId } });
  }

  // ─── Admin (mobile role workspaces) ──────────────────────

  async adminMetrics(): Promise<{ data: Record<string, unknown> }> {
    return this.request("GET", "/api/admin/metrics");
  }

  async adminListBookings(status?: string): Promise<{ data: unknown[]; total: number }> {
    return this.request("GET", "/api/bookings", {
      params: { status, limit: 50 },
    });
  }

  async approveBooking(id: string): Promise<{ data: unknown }> {
    return this.request("POST", `/api/bookings/${encodeURIComponent(id)}/approve`);
  }

  async rejectBooking(id: string, reason?: string): Promise<{ data: unknown }> {
    return this.request("POST", `/api/bookings/${encodeURIComponent(id)}/reject`, {
      body: reason ? { reason } : undefined,
    });
  }

  async adminListUsers(): Promise<{ data: unknown[] }> {
    return this.request("GET", "/api/users", { params: { limit: 100 } });
  }

  // ─── CRM (sales workspace) ───────────────────────────────

  async crmPipeline(): Promise<{ data: Record<string, unknown[]> }> {
    return this.request("GET", "/api/crm/pipeline");
  }

  async crmLead(id: string): Promise<{ data: Record<string, unknown> }> {
    return this.request("GET", `/api/crm/leads/${encodeURIComponent(id)}`);
  }

  async crmInventory(): Promise<{ data: unknown[] }> {
    return this.request("GET", "/api/crm/inventory");
  }

  async crmLogActivity(
    leadId: string,
    activity: { type: string; note?: string; nextStatus?: string },
  ): Promise<{ data: unknown }> {
    return this.request("POST", `/api/crm/leads/${encodeURIComponent(leadId)}/activities`, {
      body: activity,
    });
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

  async getTickets(
    params?: PaginationParams & { status?: string; priority?: string },
  ): Promise<PaginatedResponse<SupportTicket>> {
    return this.request("GET", "/api/tickets", {
      params: params as Record<string, string | number | boolean | undefined>,
    });
  }

  async getTicket(id: string): Promise<ApiResponse<SupportTicket>> {
    return this.request("GET", `/api/tickets/${encodeURIComponent(id)}`);
  }

  async createTicket(data: {
    subject: string;
    message: string;
    priority?: string;
  }): Promise<ApiResponse<SupportTicket>> {
    return this.request("POST", "/api/tickets", { body: data });
  }

  async updateTicket(
    id: string,
    data: Partial<SupportTicket>,
  ): Promise<ApiResponse<SupportTicket>> {
    return this.request("PUT", `/api/tickets/${encodeURIComponent(id)}`, { body: data });
  }

  // ─── Storage ─────────────────────────────────────────────

  async getUploadUrl(
    mimeType: string,
    prefix = "uploads",
  ): Promise<{ uploadUrl: string; fileUrl: string; key: string }> {
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
