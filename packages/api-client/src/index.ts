import type {
  ApiResponse,
  AuthTokens,
  Booking,
  BookingFilters,
  LoginResponse,
  Message,
  Notification,
  PaginatedResponse,
  RentalListing,
  RentalListingStatus,
  RepairRequest,
  SalesListing,
  SupportTicket,
  User,
  Vehicle,
  VehicleFilters,
} from "@trendywheels/types";
import type { ZodTypeAny } from "zod";

type TokenProvider = () => Promise<string | null>;

interface ClientConfig {
  baseUrl: string;
  getAccessToken: TokenProvider;
  getRefreshToken: TokenProvider;
  onTokenRefresh: (tokens: AuthTokens) => Promise<void>;
}

interface PaginationParams {
  page?: number;
  limit?: number;
}

class ApiClient {
  public readonly baseUrl: string;
  private config: ClientConfig;

  constructor(config: ClientConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl;
  }

  async getAccessToken(): Promise<string | null> {
    return this.config.getAccessToken();
  }

  // Raw fetch — bypasses `request()` so a 401 retry path can't recursively
  // re-enter the refresh handler. Used internally by the 401-retry branch.
  private async doRefreshTokens(refreshToken: string): Promise<AuthTokens> {
    const res = await fetch(`${this.baseUrl}/api/auth/refresh-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) throw new ApiClientError("Refresh failed", res.status, "REFRESH_FAILED");
    return res.json() as Promise<AuthTokens>;
  }

  async request<T>(
    method: string,
    path: string,
    options?: {
      body?: unknown;
      params?: Record<string, string | number | boolean | undefined>;
      // Optional Zod schema. If provided, the response is `.parse()`d so a
      // backend shape drift surfaces as a typed error at the call site
      // instead of a silent `undefined` deep in the UI. Opt-in to avoid
      // breaking every existing typed method on the client.
      parse?: ZodTypeAny;
    },
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
        // Detect abort by name — `DOMException` isn't always a global on Hermes,
        // so referencing it directly throws ReferenceError on some RN builds.
        const e = err as { name?: string } | null;
        if (e && e.name === "AbortError") {
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
        const newTokens = await this.doRefreshTokens(refreshToken);
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

    const json = await response.json();
    if (options?.parse) {
      const parsed = options.parse.safeParse(json);
      if (!parsed.success) {
        throw new ApiClientError(
          `Response shape mismatch for ${method} ${path}: ${parsed.error.message}`,
          200,
          "RESPONSE_INVALID",
        );
      }
      return parsed.data as T;
    }
    return json as T;
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

  // Customer-facing "my orders" list. Backend filters to the caller's userId
  // via the auth middleware; no query params needed.
  async getMyOrders(): Promise<ApiResponse<unknown[]>> {
    return this.request("GET", "/api/orders");
  }

  async getOrder(id: string): Promise<ApiResponse<unknown>> {
    return this.request("GET", `/api/orders/${encodeURIComponent(id)}`);
  }

  // Admin-only: every order across the platform.
  async getAllOrders(): Promise<ApiResponse<unknown[]>> {
    return this.request("GET", "/api/orders/admin/all");
  }

  // Sales-mobile inventory toggle (v1.1 feature #3). Limited to the three
  // statuses sales agents own from mobile; admin web still drives the rest.
  async setVehicleStatus(
    id: string,
    body: {
      toStatus: "available" | "reserved" | "sold";
      customerId?: string | null;
      dealNote?: string | null;
    },
  ): Promise<ApiResponse<Vehicle>> {
    return this.request("PATCH", `/api/vehicles/${encodeURIComponent(id)}/status`, { body });
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

  // ─── Rental Listings (owner-submitted carts for managed rental) ───

  async submitRentalListing(data: {
    brand: string;
    model: string;
    year: number;
    category?: string;
    condition: "excellent" | "good" | "fair" | "poor";
    dailyRateEgp?: number;
    notes?: string;
    photos?: string[];
  }): Promise<ApiResponse<RentalListing>> {
    return this.request("POST", "/api/rental-listings", { body: data });
  }

  async getRentalListings(): Promise<ApiResponse<RentalListing[]>> {
    return this.request("GET", "/api/rental-listings");
  }

  async getRentalListing(id: string): Promise<ApiResponse<RentalListing>> {
    return this.request("GET", `/api/rental-listings/${encodeURIComponent(id)}`);
  }

  async updateRentalListing(
    id: string,
    data: {
      status?: RentalListingStatus;
      declineReason?: string | null;
      vehicleId?: string | null;
      dailyRateEgp?: number | null;
      notes?: string | null;
    },
  ): Promise<ApiResponse<RentalListing>> {
    return this.request("PATCH", `/api/rental-listings/${encodeURIComponent(id)}`, { body: data });
  }

  async deleteRentalListing(id: string): Promise<{ success: boolean }> {
    return this.request("DELETE", `/api/rental-listings/${encodeURIComponent(id)}`);
  }

  // ─── Trade-in ────────────────────────────────────────────

  async submitTradeIn(data: {
    brand: string;
    model: string;
    year: number;
    condition: "excellent" | "good" | "fair" | "poor";
    notes?: string;
    photos?: string[];
  }): Promise<ApiResponse<{ id: string; status: string }>> {
    return this.request("POST", "/api/trade-in", { body: data });
  }

  async getTradeIns(): Promise<ApiResponse<unknown[]>> {
    return this.request("GET", "/api/trade-in");
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

  async adminListUsers(params?: {
    accountType?: string;
    staffRole?: string;
    q?: string;
  }): Promise<{ data: unknown[] }> {
    return this.request("GET", "/api/users", {
      params: { limit: 100, ...params } as Record<string, string | number | boolean | undefined>,
    });
  }

  async adminUpdateUser(id: string, patch: Record<string, unknown>): Promise<{ data: unknown }> {
    return this.request("PUT", `/api/users/${encodeURIComponent(id)}`, { body: patch });
  }

  async adminDisableUser(id: string): Promise<{ data: unknown }> {
    return this.request("POST", `/api/users/${encodeURIComponent(id)}/disable`);
  }

  async adminEnableUser(id: string): Promise<{ data: unknown }> {
    return this.request("POST", `/api/users/${encodeURIComponent(id)}/enable`);
  }

  async adminGetSystemConfig(): Promise<{ data: Record<string, unknown> }> {
    return this.request("GET", "/api/admin/system-config");
  }

  async adminUpdateSystemConfig(patch: Record<string, unknown>): Promise<{ data: unknown }> {
    return this.request("PATCH", "/api/admin/system-config", { body: patch });
  }

  async adminRecentActivity(limit = 50): Promise<{ data: unknown[] }> {
    return this.request("GET", "/api/admin/recent-activity", { params: { limit } });
  }

  async adminBookingTrend(days = 30): Promise<{ data: unknown[] }> {
    return this.request("GET", "/api/admin/booking-trend", { params: { days } });
  }

  async adminRevenueBreakdown(): Promise<{ data: unknown[] }> {
    return this.request("GET", "/api/admin/revenue-breakdown");
  }

  async adminListRepairs(params?: { status?: string }): Promise<{ data: RepairRequest[] }> {
    return this.request("GET", "/api/repairs", {
      params: { limit: 100, ...params } as Record<string, string | number | boolean | undefined>,
    });
  }

  async adminUpdateRepair(
    id: string,
    patch: Record<string, unknown>,
  ): Promise<{ data: RepairRequest }> {
    return this.request("PUT", `/api/repairs/${encodeURIComponent(id)}`, { body: patch });
  }

  async adminStartRepair(id: string): Promise<{ data: RepairRequest }> {
    return this.request("POST", `/api/repairs/${encodeURIComponent(id)}/start`);
  }

  async adminCompleteRepair(id: string): Promise<{ data: RepairRequest }> {
    return this.request("POST", `/api/repairs/${encodeURIComponent(id)}/complete`);
  }

  async adminListSales(): Promise<{ data: SalesListing[] }> {
    return this.request("GET", "/api/sales", { params: { limit: 100 } });
  }

  async adminUpdateSale(
    id: string,
    patch: Record<string, unknown>,
  ): Promise<{ data: SalesListing }> {
    return this.request("PUT", `/api/sales/${encodeURIComponent(id)}`, { body: patch });
  }

  async adminListMaintenance(status?: string): Promise<{ data: unknown[] }> {
    return this.request("GET", "/api/service/maintenance", { params: { status } });
  }

  async adminListCustomization(status?: string): Promise<{ data: unknown[] }> {
    return this.request("GET", "/api/service/customization", { params: { status } });
  }

  async adminListTransport(status?: string): Promise<{ data: unknown[] }> {
    return this.request("GET", "/api/service/transport", { params: { status } });
  }

  async adminUpdateServiceRequest(
    kind: "maintenance" | "customization" | "transport",
    id: string,
    patch: Record<string, unknown>,
  ): Promise<{ data: unknown }> {
    return this.request("PATCH", `/api/service/${kind}/${encodeURIComponent(id)}`, { body: patch });
  }

  // ─── CRM (sales workspace) ───────────────────────────────

  async crmPipeline(): Promise<{ data: Record<string, unknown[]> }> {
    return this.request("GET", "/api/crm/pipeline");
  }

  async crmLeads(params?: { status?: string; q?: string }): Promise<{ data: unknown[] }> {
    return this.request("GET", "/api/crm/leads", {
      params: { limit: 100, ...params } as Record<string, string | number | boolean | undefined>,
    });
  }

  async crmLead(id: string): Promise<{ data: Record<string, unknown> }> {
    return this.request("GET", `/api/crm/leads/${encodeURIComponent(id)}`);
  }

  async crmCreateLead(payload: {
    contactName: string;
    contactPhone?: string;
    contactEmail?: string;
    source?: string;
    estimatedValue?: number;
    notes?: string;
  }): Promise<{ data: Record<string, unknown> }> {
    return this.request("POST", "/api/crm/leads", { body: payload });
  }

  async crmUpdateLead(
    id: string,
    patch: Record<string, unknown>,
  ): Promise<{ data: Record<string, unknown> }> {
    return this.request("PATCH", `/api/crm/leads/${encodeURIComponent(id)}`, { body: patch });
  }

  // Rotates a lead to the next round-robin agent, excluding everyone who has
  // already tried it. Returns { status: "rotated" | "inactive", nextOwnerId?,
  // triedCount } so the UI can show "passed to Ahmed" or "moved to inactive".
  async crmRotateLead(id: string): Promise<{
    data: { status: "rotated" | "inactive"; nextOwnerId?: string; triedCount: number };
  }> {
    return this.request("POST", `/api/crm/leads/${encodeURIComponent(id)}/rotate`);
  }

  // Admin-only reassign. The route expects `ownerId` (matches Lead.ownerId);
  // the old client incorrectly sent `agentId` which made every admin reassign
  // 400 with "ownerId required" since the schema was tightened.
  async crmReassignLead(
    id: string,
    ownerId: string | null,
  ): Promise<{ data: Record<string, unknown> }> {
    return this.request("POST", `/api/crm/leads/${encodeURIComponent(id)}/reassign`, {
      body: { ownerId },
    });
  }

  async crmInventory(): Promise<{ data: unknown[] }> {
    return this.request("GET", "/api/crm/inventory");
  }

  async crmAttachVehicle(
    leadId: string,
    vehicleId: string,
    terms?: Record<string, unknown>,
  ): Promise<{ data: unknown }> {
    return this.request("POST", "/api/crm/inventory/attach", {
      body: { leadId, vehicleId, ...terms },
    });
  }

  async crmTeam(): Promise<{ data: unknown[] }> {
    return this.request("GET", "/api/crm/team");
  }

  async crmRules(): Promise<{ data: Record<string, unknown> }> {
    return this.request("GET", "/api/crm/rules");
  }

  async crmLogActivity(
    leadId: string,
    activity: {
      type:
        | "note"
        | "call"
        | "email"
        | "call_attempted"
        | "call_answered"
        | "call_no_answer"
        | "whatsapp_sent";
      body: string;
    },
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

  // ─── Referrals ───────────────────────────────────────────

  async getReferralsMe(): Promise<{
    data: { code: string; usedCount: number; referrals: Array<{ completedAt: string | null }> };
  }> {
    return this.request("GET", "/api/referrals/me");
  }

  // ─── Unread badges ───────────────────────────────────────

  async getUnreadMessageCount(): Promise<{ count: number }> {
    const json = await this.request<{ count?: number; data?: { count?: number } }>(
      "GET",
      "/api/messages/unread-count",
    );
    return { count: json.count ?? json.data?.count ?? 0 };
  }

  // ─── Client-side error reporting ─────────────────────────

  // Best-effort: swallow network errors so reporting never throws into the
  // global error handler that called us.
  async reportClientError(payload: {
    level: "error" | "warn" | "fatal";
    message: string;
    stack?: string;
    route?: string;
    metadata?: Record<string, unknown>;
    source?: "mobile" | "customer" | "admin" | "support" | "inventory";
  }): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/api/client-errors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      /* swallow — error reporting must never throw */
    }
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
