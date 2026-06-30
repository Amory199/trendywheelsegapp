import { z } from "zod";

// ─── Auth ────────────────────────────────────────────────────

export const sendOtpSchema = z.object({
  phone: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number must be at most 15 digits")
    .regex(/^\+?[0-9]+$/, "Invalid phone number format"),
});

export const verifyOtpSchema = z.object({
  phone: sendOtpSchema.shape.phone,
  otp: z
    .string()
    .length(6, "OTP must be 6 digits")
    .regex(/^[0-9]+$/, "OTP must contain only digits"),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export const staffLoginSchema = z.object({
  // The login identifier — a PHONE NUMBER (the username) or an email address.
  // Field name kept as "email" for request-shape compatibility with existing
  // clients; the server matches it against phone OR email. No length/format
  // rule here (a wrong value should fail at the credential check with a clear
  // message, not a vague validation error).
  email: z.string().min(1, "Enter your phone number or email"),
  password: z.string().min(1, "Enter your password"),
  totpCode: z.string().length(6).optional(),
});

// Set up name + password (+ optional email) after first-time phone verification,
// so subsequent logins use the phone number + password (no OTP). Reused by the
// profile screen. Email is OPTIONAL — the phone number is the identifier.
// A username must contain at least one letter so it can never be mistaken for a
// phone number (login matches username OR phone OR email). 3–30 chars, letters/
// digits/_/. only.
export const usernameRule = z
  .string()
  .regex(
    /^(?=.*[a-zA-Z])[a-zA-Z0-9_.]{3,30}$/,
    "Username must be 3–30 characters (letters, numbers, _ or .) and include a letter",
  );

export const setCredentialsSchema = z.object({
  name: z.string().min(2, "Name is too short").max(100),
  email: z.string().email("Enter a valid email address").or(z.literal("")).optional(),
  username: usernameRule.or(z.literal("")).optional(),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
  age: z.number().int().min(13).max(120).optional(),
});

// Admin "act as" — assume a customer or staff role (with a staffRole) to preview
// that experience under the role's real permissions. Admin can't assume "admin"
// (that's their real role) and staffRole is required when assuming staff.
export const assumeRoleSchema = z
  .object({
    role: z.enum(["customer", "staff"]),
    staffRole: z.enum(["sales", "support", "inventory", "mechanic"]).optional(),
  })
  .refine((v) => v.role !== "staff" || !!v.staffRole, {
    message: "staffRole is required when assuming a staff role",
    path: ["staffRole"],
  });

// ─── Vehicles ────────────────────────────────────────────────

const vehicleTypeEnum = z.enum(["4-seater", "6-seater", "LED"]);
const vehicleCategoryEnum = z.enum([
  "golf-cart",
  "hover-board",
  "scooter",
  "scooter-sidecar",
  "buggy",
  "utv",
  "jet-ski",
]);
const fuelTypeEnum = z.enum(["electric", "gasoline", "hybrid"]);
const transmissionEnum = z.enum(["automatic", "manual"]);
const vehicleStatusEnum = z.enum(["available", "rented", "maintenance", "inactive"]);
const listingTypeEnum = z.enum(["rent", "sale", "both"]);

export const createVehicleSchema = z
  .object({
    name: z.string().min(1).max(100),
    category: vehicleCategoryEnum.default("golf-cart"),
    type: vehicleTypeEnum,
    seating: z.coerce.number().int().min(1).max(20),
    fuelType: fuelTypeEnum,
    transmission: transmissionEnum,
    // Rent price. Only meaningful for rentable listings — a sale-only cart has
    // no daily rate (sending a placeholder like 1 used to leak "EGP 1" into the
    // UI). Optional/nullable here; the refine below requires it for rent/both.
    dailyRate: z.coerce.number().positive().nullable().optional(),
    location: z.string().min(1).max(200),
    features: z.array(z.string()).default([]),
    images: z.array(z.string().url()).max(10).default([]),
    listingType: listingTypeEnum.default("rent"),
    salePrice: z.coerce.number().positive().optional(),
    originalPriceEgp: z.coerce.number().positive().optional(),
    saleDescription: z.string().max(2000).optional(),
  })
  .refine((v) => v.listingType === "rent" || (v.salePrice !== undefined && v.salePrice > 0), {
    message: "salePrice is required when listingType is 'sale' or 'both'",
    path: ["salePrice"],
  })
  .refine(
    (v) =>
      v.listingType === "sale" ||
      (v.dailyRate !== undefined && v.dailyRate !== null && v.dailyRate > 0),
    {
      message: "dailyRate is required when listingType is 'rent' or 'both'",
      path: ["dailyRate"],
    },
  )
  .refine(
    (v) =>
      v.originalPriceEgp === undefined ||
      v.salePrice === undefined ||
      v.originalPriceEgp > v.salePrice,
    {
      message: "Original price must be higher than the sale price",
      path: ["originalPriceEgp"],
    },
  );

export const updateVehicleSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    category: vehicleCategoryEnum.optional(),
    type: vehicleTypeEnum.optional(),
    seating: z.coerce.number().int().min(1).max(20).optional(),
    fuelType: fuelTypeEnum.optional(),
    transmission: transmissionEnum.optional(),
    dailyRate: z.coerce.number().positive().nullable().optional(),
    location: z.string().min(1).max(200).optional(),
    features: z.array(z.string()).optional(),
    images: z.array(z.string().url()).max(10).optional(),
    status: vehicleStatusEnum.optional(),
    listingType: listingTypeEnum.optional(),
    salePrice: z.coerce.number().positive().nullable().optional(),
    originalPriceEgp: z.coerce.number().positive().nullable().optional(),
    saleDescription: z.string().max(2000).nullable().optional(),
  })
  .refine(
    // If this update sets the listing to rent/both AND touches dailyRate, the rate
    // must be a real positive value — never null/0 (that's the "EGP 1"-class leak).
    // A partial update that doesn't include dailyRate is left untouched.
    (v) =>
      !(v.listingType === "rent" || v.listingType === "both") ||
      v.dailyRate === undefined ||
      (v.dailyRate !== null && v.dailyRate > 0),
    { message: "dailyRate is required when listingType is 'rent' or 'both'", path: ["dailyRate"] },
  );

// Optional Google Maps drop-off link for delivery. Blank / omitted = store
// pickup. Kept permissive across the common Google Maps URL shapes (full
// google.com/maps, maps.google.*, and the short goo.gl / maps.app.goo.gl share
// links) so a link pasted from the app, a browser, or the share sheet all pass.
// An empty string normalizes to null.
export const dropoffLocationUrlSchema = z
  .string()
  .trim()
  .max(2000)
  .refine(
    (u) =>
      // Empty = store pickup. Otherwise an http(s) URL whose host is a Google
      // Maps / goo.gl domain (covers google.com/maps, maps.google.*, and the
      // short goo.gl + maps.app.goo.gl share links).
      u === "" || /^https?:\/\/([a-z0-9-]+\.)*(google\.[a-z.]+|goo\.gl)(\/|\?|#|$)/i.test(u),
    { message: "Paste a valid Google Maps link (or leave it blank for store pickup)" },
  )
  .transform((u) => (u === "" ? null : u))
  .optional()
  .nullable();

// How a deal is fulfilled, captured in the guided checkout. Buy-side options
// (buy / reserve / rent): delivery_now, delivery_scheduled, showroom_visit.
// Sell-side options (sell / trade-in): pickup_from_me, dropoff_showroom.
export const fulfillmentTypeSchema = z
  .enum([
    "delivery_now",
    "delivery_scheduled",
    "showroom_visit",
    "pickup_from_me",
    "dropoff_showroom",
  ])
  .optional()
  .nullable();

export const createReservationSchema = z.object({
  vehicleId: z.string().uuid(),
  notes: z.string().max(1000).optional().nullable(),
  dropoffLocationUrl: dropoffLocationUrlSchema,
  fulfillmentType: fulfillmentTypeSchema,
});

export const updateReservationSchema = z.object({
  status: z.enum(["pending", "confirmed", "completed", "cancelled"]),
});

export const vehicleFiltersSchema = z.object({
  type: vehicleTypeEnum.optional(),
  category: vehicleCategoryEnum.optional(),
  listingType: z.enum(["rent", "sale", "both"]).optional(),
  priceMin: z.coerce.number().positive().optional(),
  priceMax: z.coerce.number().positive().optional(),
  available: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(500).default(20),
});

// Sales-mobile inventory toggle (v1.1 feature #3). Sales agents may only
// flip between these three statuses from mobile; admin web still owns the
// maintenance / inactive transitions.
export const vehicleStatusChangeSchema = z.object({
  toStatus: z.enum(["available", "reserved", "sold"]),
  customerId: z.string().uuid().nullish(),
  dealNote: z.string().max(500).nullish(),
});

// ─── Bookings ────────────────────────────────────────────────

const bookingStatusEnum = z.enum(["pending", "confirmed", "completed", "cancelled"]);

export const createBookingSchema = z
  .object({
    vehicleId: z.string().uuid(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    promoCode: z.string().min(2).max(40).optional(),
    loyaltyPointsRedeemed: z.number().int().min(0).optional(),
    dropoffLocationUrl: dropoffLocationUrlSchema,
    fulfillmentType: fulfillmentTypeSchema,
  })
  .refine((data) => new Date(data.endDate) > new Date(data.startDate), {
    message: "End date must be after start date",
    path: ["endDate"],
  });

export const updateBookingSchema = z.object({
  status: bookingStatusEnum.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const bookingFiltersSchema = z.object({
  status: bookingStatusEnum.optional(),
  userId: z.string().uuid().optional(),
  vehicleId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(500).default(20),
});

// ─── Users / CRM ─────────────────────────────────────────────

// User preferences — shape-policed by zod. The DB column itself is `Json?`,
// so this is the only place the structure is enforced. Tour state is sparse
// (missing key = not seen, false = seen, true = unused).
//
// Tour key convention: `<app>:<page>` (e.g., `admin:dashboard`, `admin:sales`).
// This keeps the same key namespace usable across customer web + mobile later.
//
// Existing consumers (apps/mobile/lib/use-theme.ts, apps/customer/.../notifications)
// read theme/notifications/marketingOptIn — keep them here verbatim.
const userPreferencesBase = z.object({
  ui: z
    .object({
      tours: z.record(z.string(), z.boolean()).default({}),
      tooltips: z.enum(["on", "off"]).default("on"),
      introSeen: z.boolean().default(false),
    })
    .default({ tours: {}, tooltips: "on", introSeen: false }),
  notifications: z
    .object({
      email: z.boolean().default(true),
      sms: z.boolean().default(true),
      whatsapp: z.boolean().default(true),
      push: z.boolean().default(true),
    })
    .default({ email: true, sms: true, whatsapp: true, push: true }),
  theme: z.enum(["light", "dark", "system"]).default("system"),
  language: z.enum(["en", "ar"]).default("en"),
  marketingOptIn: z.boolean().default(false),
});

export const userPreferencesSchema = userPreferencesBase.default({});

// PATCH body — deep-merged into the existing preferences. Every leaf is
// optional; .deepPartial() recursively makes every property optional.
export const updateUserPreferencesSchema = userPreferencesBase.deepPartial();

export type UserPreferences = z.infer<typeof userPreferencesSchema>;
export type UserPreferencesPatch = z.infer<typeof updateUserPreferencesSchema>;

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  age: z.number().int().min(13).max(120).nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: sendOtpSchema.shape.phone.optional(),
  avatarUrl: z.string().url().nullable().optional(),
  accountType: z.enum(["customer", "admin", "staff"]).optional(),
  staffRole: z.enum(["admin", "sales", "support", "inventory", "mechanic"]).nullable().optional(),
  status: z.enum(["active", "inactive", "suspended"]).optional(),
  licenseNumber: z.string().min(3).max(40).nullable().optional(),
  licenseExpiry: z.string().datetime().nullable().optional(),
  licensePhotoUrl: z.string().url().nullable().optional(),
  idFrontUrl: z.string().url().nullable().optional(),
  idBackUrl: z.string().url().nullable().optional(),
  preferences: z
    .object({
      theme: z.enum(["light", "dark"]).optional(),
      language: z.enum(["en", "ar"]).optional(),
      notifications: z
        .object({
          email: z.boolean(),
          sms: z.boolean(),
          whatsapp: z.boolean(),
          push: z.boolean(),
        })
        .optional(),
      marketingOptIn: z.boolean().optional(),
    })
    // Customers default to preferences=null on signup; PUT must accept null
    // so the profile editor can submit without populating prefs first.
    .nullable()
    .optional(),
});

// ─── Messages ────────────────────────────────────────────────

export const sendMessageSchema = z.object({
  recipientId: z.string().uuid(),
  message: z.string().min(1).max(2000),
  attachments: z.array(z.string().url()).max(10).default([]),
});

// ─── Repair Requests ─────────────────────────────────────────

const repairCategoryEnum = z.enum(["mechanical", "electrical", "cosmetic", "other"]);
const repairPriorityEnum = z.enum(["low", "medium", "high", "urgent"]);
const repairStatusEnum = z.enum(["submitted", "assigned", "in-progress", "completed", "cancelled"]);

export const createRepairRequestSchema = z.object({
  vehicleId: z.string().uuid().optional(),
  description: z.string().min(10).max(500),
  category: repairCategoryEnum,
  priority: repairPriorityEnum,
  preferredDate: z.string().datetime().optional(),
  estimatedBudget: z.number().positive().optional(),
});

export const updateRepairRequestSchema = z.object({
  status: repairStatusEnum.optional(),
  assignedMechanicId: z.string().uuid().optional(),
  estimatedCost: z.number().positive().optional(),
  actualCost: z.number().positive().optional(),
});

// ─── Sales Listings ──────────────────────────────────────────

export const createSalesListingSchema = z.object({
  title: z.string().min(5).max(100),
  category: vehicleCategoryEnum.default("golf-cart"),
  make: z.string().min(1).max(50),
  model: z.string().min(1).max(50),
  year: z.coerce
    .number()
    .int()
    .min(1970)
    .max(new Date().getFullYear() + 1),
  mileage: z.coerce.number().int().min(0),
  price: z.coerce.number().positive(),
  transmission: transmissionEnum,
  fuelType: fuelTypeEnum,
  color: z.string().min(1).max(30),
  description: z.string().min(10).max(2000),
  images: z.array(z.string().url()).max(10).optional().default([]),
  dropoffLocationUrl: dropoffLocationUrlSchema,
  fulfillmentType: fulfillmentTypeSchema,
});

export const updateSalesListingSchema = createSalesListingSchema.partial().extend({
  status: z.enum(["active", "sold", "pending", "paused"]).optional(),
});

// ─── Support Tickets ─────────────────────────────────────────

export const createTicketSchema = z.object({
  subject: z.string().min(5).max(200),
  message: z.string().min(10).max(2000),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
});

export const updateTicketSchema = z.object({
  status: z.enum(["open", "in-progress", "resolved", "closed"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  assignedAgentId: z.string().uuid().optional(),
});

// A reply appended to a ticket's own message thread.
export const ticketMessageSchema = z.object({
  message: z.string().min(1).max(2000),
});

// Admin sets/resets another user's login password.
export const adminSetPasswordSchema = z.object({
  password: z.string().min(8).max(100),
});

// ─── Pagination ──────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(500).default(20),
});

// ─── ID param ────────────────────────────────────────────────

export const idParamSchema = z.object({
  id: z.string().uuid("Invalid ID format"),
});

// ─── CRM Leads ───────────────────────────────────────────────

export const leadSourceEnum = z.enum([
  "walk-in",
  "phone",
  "whatsapp",
  "instagram",
  "facebook",
  "referral",
  "other",
  "signup",
  "rent_inquiry",
  "sell_inquiry",
  "repair_inquiry",
  "manual",
  "imported",
]);

export const leadStatusEnum = z.enum(["new", "contacted", "qualified", "proposal", "won", "lost"]);

export const createLeadSchema = z.object({
  contactName: z.string().min(1).max(120),
  contactPhone: z.string().min(5).max(20).optional(),
  contactEmail: z.string().email().optional(),
  source: leadSourceEnum.default("manual"),
  estimatedValue: z.coerce.number().min(0).optional(),
  notes: z.string().max(2000).optional(),
});

export const updateLeadSchema = z.object({
  status: leadStatusEnum.optional(),
  estimatedValue: z.coerce.number().min(0).optional(),
  notes: z.string().max(2000).optional(),
  contactName: z.string().min(1).max(120).optional(),
  contactPhone: z.string().min(5).max(20).optional(),
  contactEmail: z.string().email().optional(),
  // Follow-up reminder timestamp (ISO). null clears it.
  nextActionAt: z.string().datetime().nullable().optional(),
});

export const leadActivityTypeEnum = z.enum([
  "note",
  "call",
  "email",
  "call_attempted",
  "call_answered",
  "call_no_answer",
  "whatsapp_sent",
]);

export const createLeadActivitySchema = z.object({
  type: leadActivityTypeEnum,
  body: z.string().min(1).max(2000),
  metadata: z.record(z.unknown()).optional(),
});

// ─── Products (catalog) ──────────────────────────────────────

const productCategoryEnum = z.enum(["cart_new", "cart_used", "parts", "accessory"]);

export const createProductSchema = z.object({
  category: productCategoryEnum,
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  priceEgp: z.coerce.number().positive(),
  images: z.array(z.string().url()).default([]),
  inStock: z.boolean().default(true),
  stockCount: z.coerce.number().int().nonnegative().optional().nullable(),
  attributes: z.record(z.unknown()).default({}),
  vehicleId: z.string().uuid().optional().nullable(),
  brand: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
  year: z.coerce.number().int().min(1900).max(2100).optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const productListQuerySchema = z.object({
  category: productCategoryEnum.optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  inStock: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
});

// ─── Orders ──────────────────────────────────────────────────

const orderStatusEnum = z.enum(["pending", "paid", "shipped", "delivered", "cancelled"]);

export const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.coerce.number().int().positive().default(1),
      }),
    )
    .min(1, "At least one item required"),
  tradeInId: z.string().uuid().optional().nullable(),
  dropoffLocationUrl: dropoffLocationUrlSchema,
  fulfillmentType: fulfillmentTypeSchema,
});

export const updateOrderStatusSchema = z.object({ status: orderStatusEnum });

// ─── Maintenance (vehicle servicing — staff fleet ops) ───────

export const createVehicleMaintenanceSchema = z.object({
  vehicleId: z.string().uuid(),
  type: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  scheduledAt: z.string().datetime(),
  cost: z.number().min(0).optional(),
  notes: z.string().max(2000).optional(),
  photos: z.array(z.string().url()).max(10).optional(),
});

export const updateVehicleMaintenanceSchema = z.object({
  type: z.string().min(1).max(120).optional(),
  description: z.string().max(2000).optional(),
  scheduledAt: z.string().datetime().optional(),
  cost: z.number().min(0).optional(),
  notes: z.string().max(2000).optional(),
  photos: z.array(z.string().url()).max(10).optional(),
});

export const completeVehicleMaintenanceSchema = z.object({
  cost: z.number().min(0).optional(),
  notes: z.string().max(2000).optional(),
  photos: z.array(z.string().url()).max(10).optional(),
});

// ─── Inventory ops (alert config + condition reports) ────────

export const updateAlertConfigSchema = z.object({
  utilizationMaxPct: z.number().int().min(0).max(100).optional(),
  maintenanceDueDays: z.number().int().min(1).max(365).optional(),
  maxConcurrentRepairs: z.number().int().min(0).max(1000).optional(),
});

export const createConditionReportSchema = z.object({
  notes: z.string().min(1).max(5000),
  photos: z.array(z.string().url()).max(10).default([]),
  severity: z.enum(["minor", "moderate", "severe"]).default("minor"),
});

// ─── Storage ─────────────────────────────────────────────────

export const presignUploadSchema = z.object({
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]),
  prefix: z.string().min(1).max(100).default("uploads"),
});

// ─── Transport requests (customer-side pickup/delivery) ──────

export const submitTransportSchema = z.object({
  fromAddress: z.string().min(1).max(500),
  toAddress: z.string().min(1).max(500),
  pickupAt: z.coerce.date(),
  cargoNotes: z.string().max(1000).optional(),
});

export const scheduleTransportSchema = z.object({
  priceEgp: z.coerce.number().positive(),
  driverId: z.string().uuid().optional().nullable(),
  status: z.enum(["scheduled", "in_transit", "completed", "cancelled"]).default("scheduled"),
});

// ─── Trade-in quotes ─────────────────────────────────────────

export const submitTradeInSchema = z.object({
  brand: z.string().min(1).max(100),
  model: z.string().min(1).max(100),
  year: z.coerce.number().int().min(1990).max(2100),
  condition: z.enum(["excellent", "good", "fair", "poor"]),
  notes: z.string().max(2000).optional(),
  photos: z.array(z.string().url()).max(8).default([]),
  dropoffLocationUrl: dropoffLocationUrlSchema,
  fulfillmentType: fulfillmentTypeSchema,
});

export const quoteTradeInSchema = z.object({
  quoteEgp: z.coerce.number().nonnegative(),
  validForDays: z.coerce.number().int().positive().default(7),
  status: z.enum(["quoted", "rejected"]).default("quoted"),
});

// ─── Rental listings (owner-submitted carts offered to TrendyWheels for managed rental) ───
//
// `category` is accepted in the same kebab-case shape as the public Sales API
// (e.g. "golf-cart") and converted to the Prisma snake_case enum inside the
// controller — same pattern as apps/api/src/modules/sales/controller.ts.

export const rentalListingStatusEnum = z.enum([
  "submitted",
  "reviewing",
  "approved",
  "declined",
  "paused",
  "withdrawn",
]);

export const createRentalListingSchema = z.object({
  brand: z.string().min(1).max(100),
  model: z.string().min(1).max(100),
  year: z.coerce.number().int().min(1990).max(2100),
  category: vehicleCategoryEnum.default("golf-cart"),
  condition: z.enum(["excellent", "good", "fair", "poor"]),
  dailyRateEgp: z.coerce.number().positive().optional(),
  notes: z.string().max(2000).optional(),
  photos: z.array(z.string().url()).max(8).default([]),
});

// Update covers two callers:
//  - Owner: status -> "paused" | "withdrawn" (no admin fields).
//  - Admin: status -> any transition + optional declineReason / vehicleId.
// The handler enforces which role may set which fields; schema just permits them.
export const updateRentalListingSchema = z.object({
  status: rentalListingStatusEnum.optional(),
  declineReason: z.string().max(1000).optional().nullable(),
  vehicleId: z.string().uuid().optional().nullable(),
  dailyRateEgp: z.coerce.number().positive().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

// ─── Service requests (maintenance / customization / transport) ───

const serviceStatusEnum = z.enum([
  "submitted",
  "assigned",
  "in-progress",
  "completed",
  "cancelled",
]);

export const createMaintenanceRequestSchema = z.object({
  serviceType: z.enum(["oil", "battery", "tire", "inspection", "full"]),
  preferredDate: z.string().datetime(),
  vehicleId: z.string().uuid().optional(),
  notes: z.string().max(2000).optional(),
});

export const updateMaintenanceRequestSchema = z.object({
  status: serviceStatusEnum.optional(),
  notes: z.string().max(2000).optional().nullable(),
  estimatedCost: z.coerce.number().nonnegative().optional().nullable(),
  assignedToId: z.string().uuid().optional().nullable(),
  preferredDate: z.string().datetime().optional(),
});

export const createCustomizationRequestSchema = z.object({
  kind: z.enum(["paint", "lights", "wrap", "audio", "other"]),
  budget: z.coerce.number().positive().optional(),
  vehicleId: z.string().uuid().optional(),
  notes: z.string().max(2000).optional(),
});

export const updateCustomizationRequestSchema = z.object({
  status: serviceStatusEnum.optional(),
  notes: z.string().max(2000).optional().nullable(),
  budget: z.coerce.number().nonnegative().optional().nullable(),
  assignedToId: z.string().uuid().optional().nullable(),
});

export const createTransportRequestSchema = z.object({
  fromAddress: z.string().min(3).max(500),
  toAddress: z.string().min(3).max(500),
  pickupAt: z.string().datetime(),
  cargoNotes: z.string().max(2000).optional(),
});

export const updateTransportRequestSchema = z.object({
  status: serviceStatusEnum.optional(),
  cargoNotes: z.string().max(2000).optional().nullable(),
  priceEgp: z.coerce.number().nonnegative().optional().nullable(),
  driverId: z.string().uuid().optional().nullable(),
  pickupAt: z.string().datetime().optional(),
});

// ─── Staff CRUD (admin → users) ──────────────────────────────

// Staff login via phone+OTP like everyone else, so name+phone is enough.
// Email+password are only required when role=admin (admin web login still
// uses email+password — phone OTP isn't wired into the admin dashboard).
export const createStaffSchema = z
  .object({
    name: z.string().min(1).max(100),
    phone: z.string().min(6).max(40),
    email: z.string().email().optional(),
    username: usernameRule.optional(),
    password: z.string().min(8).max(72).optional(),
    staffRole: z.enum(["admin", "sales", "support", "inventory", "mechanic"]),
  })
  .refine((data) => data.staffRole !== "admin" || !!data.password, {
    message: "Admins require a password (used for web login). Email is optional.",
    path: ["password"],
  });

export const requestAccountDeletionSchema = z.object({
  email: z.string().email(),
  phone: z.string().min(6).max(40),
  reason: z.string().max(500).optional(),
});

// ─── Admin system config + customer notes ────────────────────

export const updateSystemConfigSchema = z.object({
  companyName: z.string().min(1).max(120).optional(),
  companyEmail: z.string().email().nullable().optional(),
  companyPhone: z.string().max(40).nullable().optional(),
  companyAddress: z.string().max(500).nullable().optional(),
  companyHours: z.string().max(200).nullable().optional(),
  currency: z.enum(["EGP", "USD", "EUR"]).optional(),
  taxRatePct: z.number().min(0).max(100).optional(),
  emailTemplates: z.record(z.string(), z.unknown()).optional(),
});

export const createCustomerNoteSchema = z.object({
  body: z.string().min(1).max(5000),
});

// ─── Diagnostics (anonymous client error reporting) ──────────

export const clientErrorReportSchema = z.object({
  level: z.enum(["error", "warn", "fatal"]).default("error"),
  source: z.enum(["admin", "support", "inventory", "customer", "mobile"]),
  message: z.string().min(1).max(2000),
  stack: z.string().max(20_000).optional(),
  route: z.string().max(500).optional(),
  metadata: z.record(z.unknown()).optional(),
});

// ─── Reviews (customer-features) ─────────────────────────────

export const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().max(120).optional(),
  body: z.string().max(2000).optional(),
  photos: z.array(z.string().url()).max(8).default([]),
});

export const applyReferralSchema = z.object({
  code: z.string().min(4).max(12),
});

export const validatePromoCodeSchema = z.object({
  code: z.string().min(2).max(40),
  totalAmount: z.number().nonnegative(),
});

// ─── Godmode: promo / pricing / templates / broadcasts / canned replies ───

export const promoCodeSchema = z.object({
  code: z.string().min(3).max(40).toUpperCase(),
  kind: z.enum(["percent", "fixed"]),
  value: z.number().positive(),
  appliesTo: z.enum(["booking", "sale", "both"]).default("booking"),
  usageLimit: z.number().int().positive().optional(),
  expiresAt: z.string().datetime().optional(),
  active: z.boolean().default(true),
});

export const pricingRuleSchema = z.object({
  name: z.string().min(1).max(120),
  kind: z.enum(["weekend", "peak", "holiday", "blackout"]),
  surchargePct: z.number(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).default([]),
  dateRanges: z.array(z.object({ from: z.string(), to: z.string() })).default([]),
  appliesTo: z.enum(["rent", "sell", "both"]).default("rent"),
  active: z.boolean().default(true),
});

export const notificationTemplateSchema = z.object({
  key: z.string().min(1).max(80),
  channel: z.enum(["push", "email", "sms"]),
  subject: z.string().max(200).optional(),
  bodyMd: z.string().min(1),
  variables: z
    .array(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        default: z.string().optional(),
      }),
    )
    .default([]),
  active: z.boolean().default(true),
});

export const broadcastSchema = z.object({
  title: z.string().min(1).max(120),
  bodyMd: z.string().min(1),
  audience: z.string().min(1).max(80),
  channels: z.array(z.enum(["push", "email", "sms"])).default(["push"]),
  scheduledAt: z.string().datetime().optional(),
});

export const cannedReplySchema = z.object({
  label: z.string().min(1).max(80),
  bodyMd: z.string().min(1),
  category: z.string().max(40).optional(),
});

// ─── Response schemas (opt-in runtime validation) ────────────
// Pass these to `api.request(..., { parse: schemaName })` to validate the
// response shape at runtime. Useful when the local TypeScript type drifts
// from the server contract — you'd rather know at the network boundary
// than crash inside a render.

export const adminMetricsResponseSchema = z.object({
  data: z
    .object({
      totalUsers: z.number(),
      totalVehicles: z.number(),
      totalBookings: z.number(),
      pendingBookings: z.number(),
      pendingListings: z.number(),
      openTickets: z.number(),
      monthlyRevenue: z.number(),
    })
    .passthrough(),
});

// Most "list" responses use this envelope — { data: [...] }. We don't validate
// the row shape here because each list has wildly different fields; consumers
// pass a custom schema if they need per-row validation.
export const listEnvelopeSchema = z.object({
  data: z.array(z.unknown()),
  total: z.number().optional(),
  page: z.number().optional(),
  limit: z.number().optional(),
});

export const itemEnvelopeSchema = z.object({
  data: z.unknown(),
});
