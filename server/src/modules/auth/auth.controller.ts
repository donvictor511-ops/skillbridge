import type { Request, Response } from "express";
import { AppError } from "../../utils/appError";
import {
  clearSessionCookie,
  readSessionToken,
  setSessionCookie,
} from "./auth.cookies";
import { loginSchema, registerSchema } from "./auth.schema";
import { loginUser, registerUser } from "./auth.service";
import { createSession, deleteSessionByToken } from "./session.service";

export async function register(req: Request, res: Response): Promise<void> {
  // If the body is invalid, parse() throws a ZodError, and the error handler
  // turns it into a 400 response. The controller stays short and simple.
  const input = registerSchema.parse(req.body);

  const user = await registerUser(input);

  // A new account starts logged in, like most websites.
  const session = await createSession(user.id);
  setSessionCookie(res, session.token, session.expiresAt);

  res.status(201).json({ data: { user } });
}

export async function login(req: Request, res: Response): Promise<void> {
  const input = loginSchema.parse(req.body);

  const { user, session } = await loginUser(input);

  setSessionCookie(res, session.token, session.expiresAt);
  res.status(200).json({ data: { user } });
}

export async function logout(req: Request, res: Response): Promise<void> {
  const token = readSessionToken(req);

  if (token) {
    await deleteSessionByToken(token);
  }

  clearSessionCookie(res);
  res.status(204).send();
}

// Protected by requireAuth, which sets req.user.
export function me(req: Request, res: Response): void {
  if (!req.user) {
    throw new AppError(401, "UNAUTHENTICATED", "Please log in to continue.");
  }

  res.status(200).json({ data: { user: req.user } });
}
