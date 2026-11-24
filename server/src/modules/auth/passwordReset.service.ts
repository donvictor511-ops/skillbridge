import { createHash, randomBytes } from "node:crypto";
import { prisma } from "../../db/prisma";
import { env } from "../../config/env";
import { AppError } from "../../utils/appError";
import { hashPassword } from "./password.service";
import { isPasswordResetEmailConfigured, sendPasswordResetEmail } from "./passwordReset.email";

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;
const RESET_RESEND_COOLDOWN_MS = 60 * 1000;

function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function requestPasswordReset(email: string): Promise<void> {
  if (!isPasswordResetEmailConfigured()) {
    throw new AppError(
      503,
      "PASSWORD_RESET_UNAVAILABLE",
      "Password reset email is not set up yet. Please contact SkillBridge support.",
    );
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });

  if (!user) return;

  const now = new Date();
  const recentToken = await prisma.passwordResetToken.findFirst({
    where: {
      userId: user.id,
      createdAt: { gt: new Date(now.getTime() - RESET_RESEND_COOLDOWN_MS) },
    },
    select: { id: true },
  });
  if (recentToken) return;

  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashResetToken(token);
  const expiresAt = new Date(now.getTime() + RESET_TOKEN_TTL_MS);

  await prisma.$transaction(async (tx) => {
    await tx.passwordResetToken.deleteMany({ where: { userId: user.id } });
    await tx.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });
  });

  const resetUrl = new URL("/reset-password", env.clientOrigin);
  resetUrl.searchParams.set("token", token);

  try {
    await sendPasswordResetEmail(user.email, resetUrl.toString());
  } catch {
    // Do not log the address or bearer token. The same response is returned
    // for existing and unknown accounts to prevent email enumeration.
    console.error("Password reset email delivery failed.");
    await prisma.passwordResetToken.deleteMany({ where: { tokenHash } });
  }
}

export async function resetPassword(token: string, password: string): Promise<void> {
  const tokenHash = hashResetToken(token);
  const now = new Date();
  const reset = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, expiresAt: true },
  });

  if (!reset || reset.expiresAt <= now) {
    throw invalidResetLink();
  }

  const passwordHash = await hashPassword(password);
  const consumed = await prisma.$transaction(async (tx) => {
    const claimed = await tx.passwordResetToken.deleteMany({
      where: { id: reset.id, expiresAt: { gt: now } },
    });
    if (claimed.count !== 1) return false;

    await tx.user.update({ where: { id: reset.userId }, data: { passwordHash } });
    await tx.session.deleteMany({ where: { userId: reset.userId } });
    await tx.passwordResetToken.deleteMany({ where: { userId: reset.userId } });
    return true;
  });

  if (!consumed) throw invalidResetLink();
}

function invalidResetLink(): AppError {
  return new AppError(
    400,
    "PASSWORD_RESET_LINK_INVALID",
    "This password reset link is invalid or has expired. Request a new one.",
  );
}
