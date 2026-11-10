import type { Request, Response } from "express";
import { AppError } from "../../utils/appError";
import type { AuthUser } from "../auth/auth.types";

// Who may see a profile depends on the cookie, so shared caches and the
// browser must not keep these responses.
export function markNotCacheable(res: Response): void {
  res.setHeader("Cache-Control", "private, no-store");
}

// requireAuth has already run on these routes, so req.user exists.
// The check is here for TypeScript, and as a second safety net.
export function getSessionUser(req: Request): AuthUser {
  if (!req.user) {
    throw new AppError(401, "UNAUTHENTICATED", "Please log in to continue.");
  }
  return req.user;
}
