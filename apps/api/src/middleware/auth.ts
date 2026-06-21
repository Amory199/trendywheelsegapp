import type { AccountType, StaffRole } from "@trendywheels/types";
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { env } from "../config/env.js";
import { runWithActor } from "../lib/actor-context.js";
import { isSessionRevoked } from "../modules/auth/session-revocation.js";
import { AppError } from "../utils/errors.js";

export interface AuthPayload {
  userId: string;
  accountType: AccountType;
  // Present only on admin "act as" tokens: the assumed staffRole (when the
  // assumed accountType is "staff") and the real admin's id behind the mask.
  staffRole?: StaffRole | null;
  actingAs?: string;
  // Standard JWT claim (seconds). Auto-added by jwt.sign; used to compare a
  // token against the per-user session-revocation marker (see INC-013).
  iat?: number;
  // Millisecond issue time (our own claim). `iat` is only second-granular, so a
  // token minted in the SAME second as a revocation can't be ordered against the
  // millisecond marker (INC-046). iatMs preserves sub-second order for an exact
  // comparison. Optional for backward-compat with tokens issued before it.
  iatMs?: number;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    throw AppError.unauthorized("Missing or invalid authorization header");
  }

  const token = authHeader.slice(7);
  let payload: AuthPayload;
  try {
    payload = jwt.verify(token, env.JWT_PUBLIC_KEY, {
      algorithms: ["RS256"],
    }) as AuthPayload;
  } catch {
    throw AppError.unauthorized("Invalid or expired token");
  }

  // INC-013: reject access tokens issued before the user's sessions were
  // revoked (role/status change). Forces a stale staff token to fail closed
  // instead of riding out its 24h expiry. Fail-open inside on Redis error.
  if (await isSessionRevoked(payload)) {
    throw AppError.unauthorized("Session ended — please sign in again");
  }

  req.user = payload;
  // Carry the actor into AsyncLocalStorage so the Prisma audit extension can
  // attribute every mutation back to the calling user (and the impersonator
  // when actingAs is present) without threading the request through services.
  const ipFromHeader = (req.headers["x-forwarded-for"] as string | undefined)
    ?.split(",")[0]
    ?.trim();
  runWithActor(
    {
      userId: payload.userId,
      accountType: payload.accountType,
      actingAsId: payload.actingAs,
      ipAddress: ipFromHeader || req.ip,
      userAgent: req.headers["user-agent"],
      route: req.originalUrl ?? req.url,
      method: req.method,
    },
    () => next(),
  );
}

export function authorize(...roles: AccountType[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw AppError.unauthorized();
    }
    if (roles.length > 0 && !roles.includes(req.user.accountType)) {
      throw AppError.forbidden("Insufficient permissions");
    }
    next();
  };
}
