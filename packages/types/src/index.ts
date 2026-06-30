// ─── Shared money + sale math ────────────────────────────────
// Single source of truth used by the API, admin, mobile, and customer apps.
// Before this, each was reimplemented per-app and drifted (e.g. the rental
// day-count used Math.ceil when charging but Math.round on the invoice, so a
// partial day could be charged but not invoiced). Import from here instead of
// re-deriving. Kept inline in index.ts (not a separate module) so every
// toolchain resolves it — Metro doesn't follow a "./x.js" → x.ts re-export.

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Billable rental days for a date range. Always >= 1, and always rounds UP a
 * partial day (Math.ceil) so the charge and the invoice agree. Accepts Date or
 * ISO string. The CANONICAL definition — booking charge, booking-screen
 * estimate, and invoice line MUST all use this.
 */
export function rentalDays(start: Date | string, end: Date | string): number {
  const s = typeof start === "string" ? new Date(start) : start;
  const e = typeof end === "string" ? new Date(end) : end;
  const diff = (e.getTime() - s.getTime()) / MS_PER_DAY;
  return Math.max(1, Math.ceil(diff));
}

interface SalePriced {
  salePrice?: number | string | null;
  originalPriceEgp?: number | string | null;
}

const toNum = (v: number | string | null | undefined): number | null =>
  v == null || v === "" ? null : Number(v);

/** A vehicle is on sale only with BOTH a salePrice and a higher originalPriceEgp. */
export function isVehicleOnSale(v: SalePriced): boolean {
  const sale = toNum(v.salePrice);
  const original = toNum(v.originalPriceEgp);
  return sale != null && original != null && original > sale;
}

/** Whole-number discount percent (0 when not on sale). */
export function discountPercent(v: SalePriced): number {
  const sale = toNum(v.salePrice);
  const original = toNum(v.originalPriceEgp);
  if (sale == null || original == null || original <= sale) return 0;
  return Math.round(((original - sale) / original) * 100);
}

// Loyalty/referral economics. Single source so the API (authoritative charge)
// and the customer-app estimate can't show one number and bill another. Not yet
// admin-configurable — moving them to SystemConfig is a separate deferred change;
// centralizing first removes the drift risk.
export const LOYALTY = {
  /** Points earned per EGP 100 of completed rental spend. */
  POINTS_PER_EGP_100: 10,
  /** EGP value of one redeemed point. */
  REDEEM_VALUE_PER_POINT: 0.1,
  /** Minimum points required to redeem any discount. */
  MIN_REDEEM_POINTS: 500,
  /** Cap on the loyalty discount as a fraction of the booking total. */
  MAX_DISCOUNT_FRACTION: 0.5,
  /** Points granted to BOTH referrer and referee on first completed booking. */
  REFERRAL_BONUS_POINTS: 500,
} as const;

/** Lifetime-points thresholds for each tier. */
export const LOYALTY_TIER_THRESHOLDS = {
  platinum: 15000,
  gold: 5000,
  silver: 1000,
  bronze: 0,
} as const;

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
  // National-ID verification (front + back), captured once and reused for any
  // transaction. idVerified flips true once both images are on file.
  idFrontUrl?: string | null;
  idBackUrl?: string | null;
  idVerified?: boolean;
  idVerifiedAt?: string | null;
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
  // null for sale-only carts (they have no rent price). Always present for
  // rent/both listings. Render as a rent price ONLY when listingType is
  // rent/both — never show it for a sale-only cart.
  dailyRate: number | null;
  location: string;
  status: VehicleStatus;
  listingType: ListingType;
  salePrice: number | null;
  originalPriceEgp: number | null;
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
  dropoffLocationUrl?: string | null;
  fulfillmentType?: string | null;
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
  dropoffLocationUrl?: string | null;
  fulfillmentType?: string | null;
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

export type ReservationStatus = "pending" | "confirmed" | "completed" | "cancelled";

export interface Reservation {
  id: string;
  userId: string;
  vehicleId: string;
  status: ReservationStatus;
  amountEgp: number;
  notes: string | null;
  dropoffLocationUrl?: string | null;
  fulfillmentType?: string | null;
  idFrontUrl: string | null;
  idBackUrl: string | null;
  createdAt: string;
  updatedAt: string;
  vehicle?: Vehicle;
  user?: { id: string; name: string; email: string | null; phone: string };
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
