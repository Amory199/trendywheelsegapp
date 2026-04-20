import { describe, expect, it } from "@jest/globals";

import { AppError } from "../src/utils/errors.js";

describe("AppError", () => {
  it("creates a not-found error", () => {
    const err = AppError.notFound("Vehicle not found");
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe("NOT_FOUND");
    expect(err.message).toBe("Vehicle not found");
  });

  it("creates an unauthorized error", () => {
    const err = AppError.unauthorized();
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe("UNAUTHORIZED");
  });

  it("creates a forbidden error", () => {
    const err = AppError.forbidden("Insufficient permissions");
    expect(err.statusCode).toBe(403);
    expect(err.message).toBe("Insufficient permissions");
  });

  it("creates a conflict error", () => {
    const err = AppError.conflict("Vehicle is not available");
    expect(err.statusCode).toBe(409);
  });
});
