import { createHash, randomBytes } from "node:crypto";
import { prisma } from "../../db/prisma";
import type { AuthUser } from "./auth.types";

export const SESSION_COOKIE_NAME = "sb_session";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// We store only the hash of the token, never the token itself.
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export interface CreatedSession {
  token: string;
  expiresAt: Date;
}

export async function createSession(userId: string): Promise<CreatedSession> {
  // 32 random bytes = a token that cannot be guessed.
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.session.create({
    data: { userId, tokenHash: hashToken(token), expiresAt },
  });

  return { token, expiresAt };
}

// Returns the user for a valid, unexpired session, or null.
export async function findUserBySessionToken(
  token: string,
): Promise<AuthUser | null> {
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      expiresAt: true,
      user: { select: { id: true, email: true, createdAt: true } },
    },
  });

  if (!session || session.expiresAt <= new Date()) {
    return null;
  }

  return session.user;
}

export async function deleteSessionByToken(token: string): Promise<void> {
  // deleteMany does not fail if the session is already gone.
  await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
}
