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

/** Short weekday labels indexed by JS getDay() (0=Sun … 6=Sat). */
export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** The weekday number (0=Sun … 6=Sat) of a date-only string, computed in UTC so a
 *  `YYYY-MM-DD` slice maps to the intended calendar day regardless of the runtime tz. */
export function weekdayOf(day: Date | string): number {
  const d = typeof day === "string" ? new Date(`${day.slice(0, 10)}T00:00:00Z`) : day;
  return d.getUTCDay();
}

/**
 * The sorted, unique weekdays (0=Sun … 6=Sat) within [start, end] INCLUSIVE that
 * are NOT in `availableDays`. Empty `availableDays` = available every day → []. The
 * CANONICAL weekly-availability rule — the booking guard and the app date picker
 * must both use this so "block unavailable days" means the same on client & server.
 */
export function unavailableWeekdays(
  start: Date | string,
  end: Date | string,
  availableDays: number[] | null | undefined,
): number[] {
  if (!availableDays || availableDays.length === 0) return [];
  const allowed = new Set(availableDays);
  const s = new Date(`${String(start).slice(0, 10)}T00:00:00Z`);
  const e = new Date(`${String(end).slice(0, 10)}T00:00:00Z`);
  const hit = new Set<number>();
  for (let t = s.getTime(); t <= e.getTime(); t += MS_PER_DAY) {
    const wd = new Date(t).getUTCDay();
    if (!allowed.has(wd)) hit.add(wd);
  }
  return [...hit].sort((a, b) => a - b);
}

/** A date (or ISO/Date) as a `YYYY-MM-DD` string, in UTC. */
export function toISODate(day: Date | string): string {
  if (typeof day === "string") return day.slice(0, 10);
  return day.toISOString().slice(0, 10);
}

/** The admin-blocked dates (YYYY-MM-DD) that fall within [start, end] inclusive. */
export function blockedDatesInRange(
  start: Date | string,
  end: Date | string,
  blockedDates: Array<Date | string> | null | undefined,
): string[] {
  if (!blockedDates || blockedDates.length === 0) return [];
  const blocked = new Set(blockedDates.map(toISODate));
  const s = new Date(`${toISODate(start)}T00:00:00Z`);
  const e = new Date(`${toISODate(end)}T00:00:00Z`);
  const hit: string[] = [];
  for (let t = s.getTime(); t <= e.getTime(); t += MS_PER_DAY) {
    const iso = new Date(t).toISOString().slice(0, 10);
    if (blocked.has(iso)) hit.push(iso);
  }
  return hit;
}

export interface RentalRates {
  daily: number;
  weekly?: number | null;
  monthly?: number | null;
}

export interface RentalQuoteResult {
  /** Billable days (>= 1). */
  days: number;
  /** Cheapest total across daily/weekly/monthly blocks. */
  total: number;
}

/**
 * Cheapest rental total for `days` billable days given daily/weekly/monthly rates.
 * A missing weekly/monthly rate falls back to daily×7 / daily×30 (no discount).
 * Uses a DP over days so the customer always gets the cheapest mix of blocks and
 * is never charged more than the next tier up — the CANONICAL rental price. The
 * booking charge and the app estimate MUST both use this.
 */
export function rentalQuote(days: number, rates: RentalRates): RentalQuoteResult {
  const daily = rates.daily;
  const weekly = rates.weekly != null && rates.weekly > 0 ? rates.weekly : daily * 7;
  const monthly = rates.monthly != null && rates.monthly > 0 ? rates.monthly : daily * 30;
  const n = Math.max(1, Math.ceil(days));
  // f[i] = cheapest cost to cover i billable days. A block may over-cover the
  // tail (max(0, i-7)), so a short rental is never charged above the weekly rate.
  const f = [0];
  for (let i = 1; i <= n; i++) {
    f[i] = Math.min(
      f[i - 1] + daily,
      f[Math.max(0, i - 7)] + weekly,
      f[Math.max(0, i - 30)] + monthly,
    );
  }
  return { days: n, total: Math.round(f[n] * 100) / 100 };
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

export type VehicleType = "off-road" | "on-road" | "utility" | "luxury";
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
  type: VehicleType | null;
  seating: number;
  fuelType: FuelType;
  transmission: Transmission;
  // null for sale-only carts (they have no rent price). Always present for
  // rent/both listings. Render as a rent price ONLY when listingType is
  // rent/both — never show it for a sale-only cart.
  dailyRate: number | null;
  // Optional longer-term rates (null = derive from daily in rentalQuote).
  weeklyRate: number | null;
  monthlyRate: number | null;
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
  // Weekdays this vehicle can be rented on (0=Sun … 6=Sat). Empty = every day.
  availableDays: number[];
  // One-off admin blackout dates (YYYY-MM-DD) on top of the weekday pattern.
  blockedDates: string[];
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
  paymentMethod?: string | null;
  // QR check-in / handover — set once staff hand the vehicle over at pickup.
  checkedInAt?: string | null;
  checkedInById?: string | null;
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
  /** Staff-set expected completion time; null until staff commit to a time. */
  etaAt?: string | null;
  /** Populated on detail fetches so the app can name + call the mechanic. */
  mechanic?: { id?: string; name?: string | null; phone?: string | null } | null;
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
