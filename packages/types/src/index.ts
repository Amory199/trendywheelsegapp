// ─── Enums ───────────────────────────────────────────────────

export type AccountType = "customer" | "staff" | "admin";
export type UserStatus = "active" | "inactive" | "suspended";
export type LoyaltyTier = "bronze" | "silver" | "gold" | "platinum";

export type VehicleType = "4-seater" | "6-seater" | "LED";
export type FuelType = "electric" | "gasoline" | "hybrid";
export type Transmission = "automatic" | "manual";
export type VehicleStatus = "available" | "rented" | "maintenance" | "inactive";

export type BookingStatus = "confirmed" | "completed" | "cancelled";
export type PaymentStatus = "pending" | "paid" | "refunded";

export type RepairCategory = "mechanical" | "electrical" | "cosmetic" | "other";
export type RepairPriority = "low" | "medium" | "high" | "urgent";
export type RepairStatus = "submitted" | "assigned" | "in-progress" | "completed" | "cancelled";

export type TicketStatus = "open" | "in-progress" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "urgent";

// ─── Domain Models ───────────────────────────────────────────

export interface User {
  id: string;
  phone: string;
  email: string | null;
  name: string;
  avatarUrl: string | null;
  accountType: AccountType;
  status: UserStatus;
  preferences: UserPreferences | null;
  loyaltyTier: LoyaltyTier;
  loyaltyPoints: number;
  licenseNumber?: string | null;
  licenseExpiry?: string | null;
  licensePhotoUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  theme: "light" | "dark";
  language: "en" | "ar";
  notifications: {
    email: boolean;
    sms: boolean;
    whatsapp: boolean;
    push: boolean;
  };
  marketingOptIn: boolean;
}

export interface Vehicle {
  id: string;
  name: string;
  type: VehicleType;
  seating: number;
  fuelType: FuelType;
  transmission: Transmission;
  dailyRate: number;
  location: string;
  status: VehicleStatus;
  totalBookings: number;
  averageRating: number;
  images: string[];
  features: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  id: string;
  userId: string;
  vehicleId: string;
  startDate: string;
  endDate: string;
  status: BookingStatus;
  totalCost: number;
  paymentStatus: PaymentStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  conversationId: string;
  message: string;
  attachments: string[];
  readAt: string | null;
  createdAt: string;
}

export interface Conversation {
  id: string;
  participantIds: string[];
  lastMessageAt: string;
  createdAt: string;
}

export interface RepairRequest {
  id: string;
  userId: string;
  vehicleId: string;
  description: string;
  category: RepairCategory;
  priority: RepairPriority;
  status: RepairStatus;
  assignedMechanicId: string | null;
  estimatedCost: number | null;
  actualCost: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface SalesListing {
  id: string;
  userId: string;
  title: string;
  make: string;
  model: string;
  year: number;
  mileage: number;
  price: number;
  transmission: Transmission;
  fuelType: FuelType;
  color: string;
  description: string;
  images: string[];
  status: "active" | "sold" | "pending";
  viewsCount: number;
  inquiriesCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  assignedAgentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface KBArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  viewsCount: number;
  helpfulCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

// ─── API Types ───────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiResponse<T> {
  data: T;
}

export interface ApiError {
  message: string;
  code: string;
  statusCode: number;
}

export interface AuthTokens {
  token: string;
  refreshToken: string;
}

export interface LoginResponse extends AuthTokens {
  user: User;
}

// ─── Query/Filter Types ──────────────────────────────────────

export interface VehicleFilters {
  type?: VehicleType;
  priceMin?: number;
  priceMax?: number;
  available?: boolean;
  page?: number;
  limit?: number;
}

export interface BookingFilters {
  status?: BookingStatus;
  userId?: string;
  vehicleId?: string;
  page?: number;
  limit?: number;
}

export interface TicketFilters {
  status?: TicketStatus;
  priority?: TicketPriority;
  assignedAgentId?: string;
  page?: number;
  limit?: number;
}
