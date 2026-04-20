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
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  totpCode: z.string().length(6).optional(),
});

// ─── Vehicles ────────────────────────────────────────────────

const vehicleTypeEnum = z.enum(["4-seater", "6-seater", "LED"]);
const fuelTypeEnum = z.enum(["electric", "gasoline", "hybrid"]);
const transmissionEnum = z.enum(["automatic", "manual"]);
const vehicleStatusEnum = z.enum(["available", "rented", "maintenance", "inactive"]);

export const createVehicleSchema = z.object({
  name: z.string().min(1).max(100),
  type: vehicleTypeEnum,
  seating: z.number().int().min(1).max(20),
  fuelType: fuelTypeEnum,
  transmission: transmissionEnum,
  dailyRate: z.number().positive(),
  location: z.string().min(1).max(200),
  features: z.array(z.string()).default([]),
});

export const updateVehicleSchema = createVehicleSchema.partial().extend({
  status: vehicleStatusEnum.optional(),
});

export const vehicleFiltersSchema = z.object({
  type: vehicleTypeEnum.optional(),
  priceMin: z.coerce.number().positive().optional(),
  priceMax: z.coerce.number().positive().optional(),
  available: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ─── Bookings ────────────────────────────────────────────────

const bookingStatusEnum = z.enum(["confirmed", "completed", "cancelled"]);

export const createBookingSchema = z
  .object({
    vehicleId: z.string().uuid(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
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
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ─── Users / CRM ─────────────────────────────────────────────

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  phone: sendOtpSchema.shape.phone.optional(),
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
const repairStatusEnum = z.enum(["submitted", "assigned", "in-progress", "completed"]);

export const createRepairRequestSchema = z.object({
  vehicleId: z.string().uuid(),
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
  make: z.string().min(1).max(50),
  model: z.string().min(1).max(50),
  year: z
    .number()
    .int()
    .min(1970)
    .max(new Date().getFullYear() + 1),
  mileage: z.number().int().min(0),
  price: z.number().positive(),
  transmission: transmissionEnum,
  fuelType: fuelTypeEnum,
  color: z.string().min(1).max(30),
  description: z.string().min(10).max(2000),
});

export const updateSalesListingSchema = createSalesListingSchema.partial().extend({
  status: z.enum(["active", "sold", "pending"]).optional(),
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

// ─── Pagination ──────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ─── ID param ────────────────────────────────────────────────

export const idParamSchema = z.object({
  id: z.string().uuid("Invalid ID format"),
});
