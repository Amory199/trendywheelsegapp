import {
  createBookingSchema,
  createVehicleSchema,
  sendOtpSchema,
  verifyOtpSchema,
} from "@trendywheels/validators";
import { describe, expect, it } from "@jest/globals";

describe("validators", () => {
  it("validates a valid Egyptian phone number", () => {
    expect(() => sendOtpSchema.parse({ phone: "+201112223344" })).not.toThrow();
  });

  it("rejects an invalid phone number", () => {
    expect(() => sendOtpSchema.parse({ phone: "abc" })).toThrow();
  });

  it("validates a 6-digit OTP", () => {
    expect(() =>
      verifyOtpSchema.parse({ phone: "+201112223344", otp: "123456" }),
    ).not.toThrow();
  });

  it("rejects a 5-digit OTP", () => {
    expect(() => verifyOtpSchema.parse({ phone: "+201112223344", otp: "12345" })).toThrow();
  });

  it("validates a vehicle creation payload", () => {
    expect(() =>
      createVehicleSchema.parse({
        name: "Tesla Model 3",
        type: "4-seater",
        seating: 4,
        fuelType: "electric",
        transmission: "automatic",
        dailyRate: 2500,
        location: "New Cairo",
      }),
    ).not.toThrow();
  });

  it("rejects booking when end date is before start date", () => {
    expect(() =>
      createBookingSchema.parse({
        vehicleId: "11111111-1111-1111-1111-111111111111",
        startDate: "2026-05-10T00:00:00.000Z",
        endDate: "2026-05-05T00:00:00.000Z",
      }),
    ).toThrow();
  });
});
