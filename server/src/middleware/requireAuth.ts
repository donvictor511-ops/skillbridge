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

  req.user = user;
  next();
}
