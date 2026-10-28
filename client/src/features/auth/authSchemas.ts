import { z } from "zod";

// IMPORTANT: these checks only give the user FAST feedback.
// The server repeats every check and is the real authority. The numbers here
// must match the server (server/src/modules/auth/auth.schema.ts).
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

const emailField = z
  .string()
  .trim()
  .min(1, "Enter your email address.")
  .pipe(z.email("Enter a valid email address."));

export const loginFormSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Enter your password."),
});

export const registerFormSchema = z.object({
  email: emailField,
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters.`)
    .max(PASSWORD_MAX_LENGTH, `Use at most ${PASSWORD_MAX_LENGTH} characters.`),
});

// Turns Zod's list of problems into { fieldName: firstMessage }.
export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};

  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "form");
    if (!(field in fieldErrors)) {
      fieldErrors[field] = issue.message;
    }
  }

  return fieldErrors;
}
