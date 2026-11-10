import type { NextFunction, Request, Response } from "express";
import { readSessionToken } from "../modules/auth/auth.cookies";
import { findUserBySessionToken } from "../modules/auth/session.service";

// Like requireAuth, but it never says no.
// If there is a valid session, req.user is set. If not, the request simply
// continues as an anonymous visitor. Used where the answer depends on WHO is
// asking (for example, viewing a profile).
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const token = readSessionToken(req);

  if (token) {
    const user = await findUserBySessionToken(token);
    if (user) {
      req.user = user;
    }
  }

  next();
}
