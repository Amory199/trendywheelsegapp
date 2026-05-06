import type { AccountType } from "@trendywheels/types";
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { env } from "../config/env.js";
import { runWithActor } from "../lib/actor-context.js";
import { AppError } from "../utils/errors.js";

export interface AuthPayload {
  userId: string;
  accountType: AccountType;
  actingAs?: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
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
