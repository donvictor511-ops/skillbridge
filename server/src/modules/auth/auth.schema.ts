import { z } from "zod";
import { isCommonPassword } from "./commonPasswords";

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

// Describes exactly what a registration request may contain.
// Any other fields sent by the client are dropped.
export const registerSchema = z.object({
  email: z
    .string("Email is required.")
    .trim()
    .toLowerCase()
    .max(254, "Email must be at most 254 characters long.")
    .pipe(z.email("Enter a valid email address.")),

  // The password is NOT trimmed or changed: spaces are allowed, and what the
  // user typed is exactly what we hash.
  password: z
    .string("Password is required.")
    .min(
      PASSWORD_MIN_LENGTH,
      `Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`,
    )
    .max(
      PASSWORD_MAX_LENGTH,
      `Password must be at most ${PASSWORD_MAX_LENGTH} characters long.`,
    )
    .refine(
      (value) => !isCommonPassword(value),
      "This password is too common. Please choose a longer, more unique one.",
    ),
});

// A TypeScript type created FROM the schema, so the two can never disagree.
export type RegisterInput = z.infer<typeof registerSchema>;
