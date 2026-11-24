import { z } from "zod";
import { isCommonPassword } from "./commonPasswords";

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

const emailSchema = z
  .string("Email is required.")
  .trim()
  .toLowerCase()
  .max(254, "Email must be at most 254 characters long.")
  .pipe(z.email("Enter a valid email address."));

// Describes exactly what a registration request may contain.
// Any other fields sent by the client are dropped.
export const registerSchema = z.object({
  email: emailSchema,

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
      "This password is too simple. Avoid repeated characters, sequences, and keyboard patterns.",
    ),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string("Password is required.")
    .min(1, "Password is required.")
    .max(PASSWORD_MAX_LENGTH, "Password is too long."),
});

export const accountAppealSchema = loginSchema.extend({
  message: z.string().trim().min(20, "Please explain your appeal in at least 20 characters.").max(2000),
});

export const passwordResetRequestSchema = z.object({ email: emailSchema });

export const passwordResetSchema = z.object({
  token: z.string().min(40).max(200),
  password: z
    .string("Password is required.")
    .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`)
    .max(PASSWORD_MAX_LENGTH, `Password must be at most ${PASSWORD_MAX_LENGTH} characters long.`)
    .refine((value) => !isCommonPassword(value), "This password is too simple. Avoid repeated characters, sequences, and keyboard patterns."),
});

// TypeScript types created FROM the schemas, so they can never disagree.
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type AccountAppealInput = z.infer<typeof accountAppealSchema>;
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetInput = z.infer<typeof passwordResetSchema>;
