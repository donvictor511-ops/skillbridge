import { prisma } from "../../db/prisma";
import { AppError } from "../../utils/appError";
import { authUserSelect } from "./auth.types";
import type { AuthUser } from "./auth.types";
import type { LoginInput, RegisterInput } from "./auth.schema";
import {
  getDummyPasswordHash,
  hashPassword,
  verifyPassword,
} from "./password.service";
import { createSession } from "./session.service";
import type { CreatedSession } from "./session.service";

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

export async function registerUser(input: RegisterInput): Promise<AuthUser> {
  const passwordHash = await hashPassword(input.password);

  try {
    // We TRY to insert and let the database's unique constraint decide.
    // ("Check first, then insert" can fail when two requests arrive together.)
    return await prisma.user.create({
      data: { email: input.email, passwordHash },
      select: authUserSelect,
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

interface LoginResult {
  user: AuthUser;
  session: CreatedSession;
}

export async function loginUser(input: LoginInput): Promise<LoginResult> {
  const found = await prisma.user.findUnique({
    where: { email: input.email },
    select: { ...authUserSelect, passwordHash: true },
  });

  // ALWAYS do exactly one password check, even if the email is unknown.
  // Otherwise "unknown email" would answer faster than "wrong password",
  // and attackers could use the timing to discover real accounts.
  const hashToCheck = found?.passwordHash ?? (await getDummyPasswordHash());
  const passwordMatches = await verifyPassword(hashToCheck, input.password);

  if (!found || !passwordMatches) {
    // One generic message for BOTH failures.
    throw new AppError(
      401,
      "INVALID_CREDENTIALS",
      "Email or password is incorrect.",
    );
  }

  const session = await createSession(found.id);

  // Build the user by hand so the password hash can never slip through.
  const user: AuthUser = {
    id: found.id,
    email: found.email,
    createdAt: found.createdAt,
    capabilities: found.capabilities,
    onboardedAt: found.onboardedAt,
  };

  return { user, session };
}
