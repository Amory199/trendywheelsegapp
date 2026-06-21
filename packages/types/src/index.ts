// ─── Enums ───────────────────────────────────────────────────

export type AccountType = "customer" | "staff" | "admin";
export type UserStatus = "active" | "inactive" | "suspended";
export type LoyaltyTier = "bronze" | "silver" | "gold" | "platinum";

export type VehicleType = "4-seater" | "6-seater" | "LED";
export type VehicleCategory =
  | "golf-cart"
  | "hover-board"
  | "scooter"
  | "scooter-sidecar"
  | "buggy"
  | "utv"
  | "jet-ski";

export const VEHICLE_CATEGORIES: ReadonlyArray<{
  key: VehicleCategory;
  label: string;
  icon: string;
}> = [
  { key: "golf-cart", label: "Golf Carts", icon: "car-sport" },
  { key: "scooter", label: "Scooters", icon: "bicycle" },
  { key: "scooter-sidecar", label: "Side-Car Scooters", icon: "people" },
  { key: "buggy", label: "Buggies", icon: "speedometer" },
  { key: "utv", label: "UTVs", icon: "car" },
  { key: "jet-ski", label: "Jet Skis", icon: "boat" },
  { key: "hover-board", label: "Hover Boards", icon: "rocket" },
];

export type FuelType = "electric" | "gasoline" | "hybrid";
export type Transmission = "automatic" | "manual";
export type VehicleStatus = "available" | "rented" | "maintenance" | "inactive";
export type ListingType = "rent" | "sale" | "both";

export type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled";
export type PaymentStatus = "pending" | "paid" | "refunded";

export type RepairCategory = "mechanical" | "electrical" | "cosmetic" | "other";
export type RepairPriority = "low" | "medium" | "high" | "urgent";
export type RepairStatus = "submitted" | "assigned" | "in-progress" | "completed" | "cancelled";

export type TicketStatus = "open" | "in-progress" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "urgent";

// ─── Domain Models ───────────────────────────────────────────

export type StaffRole = "admin" | "sales" | "support" | "inventory" | "mechanic";

export interface User {
  id: string;
  phone: string;
  email: string | null;
  username?: string | null;
  name: string;
  age?: number | null;
  avatarUrl: string | null;
  accountType: AccountType;
  staffRole?: StaffRole | null;
  status: UserStatus;
  // True once the user has set an email + password (so they can skip OTP).
  hasPassword?: boolean;
  // Set only while an admin is "acting as" this role: the real admin's id.
  actingAsAdminId?: string | null;
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
  theme: "light" | "dark" | "system";
  language: "en" | "ar";
  notifications: {
    email: boolean;
    sms: boolean;
    whatsapp: boolean;
    push: boolean;
  };
  marketingOptIn: boolean;
  /**
   * UI hints — tour state + tooltip preference. Sparse: the server zod schema
   * fills in defaults on first PATCH, but legacy `preferences` rows may not
   * have this key, so every read should treat each subfield as optional.
   */
  ui?: {
    tours?: Record<string, boolean>;
    tooltips?: "on" | "off";
    introSeen?: boolean;
  };
}

export interface Vehicle {
  id: string;
  name: string;
  category: VehicleCategory;
  type: VehicleType;
  seating: number;
  fuelType: FuelType;
  transmission: Transmission;
  dailyRate: number;
  location: string;
  status: VehicleStatus;
  listingType: ListingType;
  salePrice: number | null;
  saleDescription: string | null;
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
  category: VehicleCategory;
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

export type RentalListingStatus =
  | "submitted"
  | "reviewing"
  | "approved"
  | "declined"
  | "paused"
  | "withdrawn";

export interface RentalListing {
  id: string;
  userId: string;
  brand: string;
  model: string;
  year: number;
  category: VehicleCategory;
  condition: "excellent" | "good" | "fair" | "poor";
  dailyRateEgp: number | null;
  notes: string | null;
  photos: string[];
  status: RentalListingStatus;
  declineReason: string | null;
  reviewedById: string | null;
  reviewedAt: string | null;
  vehicleId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type TradeInStatus =
  | "submitted"
  | "reviewing"
  | "quoted"
  | "accepted"
  | "declined"
  | "expired";

export interface TradeIn {
  id: string;
  userId: string;
  brand: string;
  model: string;
  year: number;
  condition: "excellent" | "good" | "fair" | "poor";
  notes: string | null;
  photos: string[];
  status: TradeInStatus;
  quoteEgp: number | string | null;
  quoteValidUntil: string | null;
  appliedToOrderId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  body: string;
  createdAt: string;
  sender?: { id: string; name: string | null; accountType: AccountType };
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
  // Present on detail/create responses — the ticket's own message thread.
  messages?: TicketMessage[];
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
  category?: VehicleCategory;
  listingType?: ListingType;
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
