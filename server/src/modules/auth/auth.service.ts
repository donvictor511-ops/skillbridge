import { prisma } from "../../db/prisma";
import { AppError } from "../../utils/appError";
import type { RegisterInput } from "./auth.schema";
import { hashPassword } from "./password.service";

// The ONLY user fields we ever send to the client.
// Note: no password and no passwordHash.
export interface PublicUser {
  id: string;
  email: string;
  createdAt: Date;
}

// P2002 is Prisma's code for "unique constraint violated".
// 23505 is PostgreSQL's own code for the same problem.
function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error.code === "P2002" || error.code === "23505")
  );
}

export async function registerUser(input: RegisterInput): Promise<PublicUser> {
  const passwordHash = await hashPassword(input.password);

  try {
    // We TRY to insert and let the database's unique constraint decide.
    // ("Check first, then insert" can fail when two requests arrive together.)
    return await prisma.user.create({
      data: { email: input.email, passwordHash },
      select: { id: true, email: true, createdAt: true },
    });
  } catch (error: unknown) {
    if (isUniqueConstraintError(error)) {
      throw new AppError(
        409,
        "EMAIL_ALREADY_REGISTERED",
        "An account with this email already exists.",
        [{ field: "email", message: "This email is already registered." }],
      );
    }
    throw error;
  }
}
