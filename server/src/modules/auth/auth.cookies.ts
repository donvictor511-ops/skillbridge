  import type { CookieOptions, Request, Response } from "express";
import { env } from "../../config/env";
import { SESSION_COOKIE_NAME } from "./session.service";

const baseCookieOptions: CookieOptions = {
  httpOnly: true, // JavaScript in the page cannot read this cookie
  // The production UI (Vercel) and API (Render) are on different sites.
  // Production fetches need this cookie; Lax prevents cross-site API requests.
  sameSite: env.nodeEnv === "production" ? "none" : "lax",
  secure: env.nodeEnv === "production", // HTTPS only in production
  path: "/",
};

export function setSessionCookie(
  res: Response,
  token: string,
  expiresAt: Date,
): void {
  res.cookie(SESSION_COOKIE_NAME, token, {
    ...baseCookieOptions,
    expires: expiresAt,
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, baseCookieOptions);
}

// Returns the session token from the request cookies, or null.
export function readSessionToken(req: Request): string | null {
  const value: unknown = req.cookies?.[SESSION_COOKIE_NAME];
  return typeof value === "string" && value !== "" ? value : null;
}
