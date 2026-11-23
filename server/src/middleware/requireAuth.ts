import type { NextFunction, Request, Response } from "express";
import {
  clearSessionCookie,
  readSessionToken,
} from "../modules/auth/auth.cookies";
import { findUserBySessionToken } from "../modules/auth/session.service";
import { AppError } from "../utils/appError";

// The guard for protected routes. Put it before the controller:
//   router.get('/me', requireAuth, me)
// It answers "who is this?" (authentication). Whether this person may do
// a specific thing (authorization) is a separate check in each feature.
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = readSessionToken(req);
  const user = token ? await findUserBySessionToken(token) : null;

  if (!user) {
    // A cookie that no longer matches a session is useless. Remove it.
    if (token) {
      clearSessionCookie(res);
    }
    throw new AppError(401, "UNAUTHENTICATED", "Please log in to continue.");
  }

  if (user.suspendedAt) {
    clearSessionCookie(res);
    throw new AppError(403, "ACCOUNT_SUSPENDED", "This account is suspended. Contact SkillBridge support for help.");
  }

  req.user = user;
  next();
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (req.user?.role !== "admin") {
    throw new AppError(403, "ADMIN_REQUIRED", "Administrator access is required.");
  }
  next();
}

export function requireWriteAccess(req: Request, _res: Response, next: NextFunction): void {
  const restrictedUntil = req.user?.restrictedUntil;
  if (restrictedUntil && restrictedUntil > new Date()) {
    throw new AppError(403, "ACCOUNT_RESTRICTED", "This account is temporarily restricted from making changes.");
  }
  next();
}
