import { z } from "zod";
// These limits live in the onboarding options file for now.
import { MAX_SKILL_LENGTH } from "../onboarding/onboarding.options";

function collapseSpaces(value: string): string {
  return value.replace(/\s+/g, " ");
}

// A skill is plain text: letters, numbers, spaces, and a few symbols that real
// skills use (C++, C#, .NET, Node.js, UI/UX). Everything else is rejected.
export const skillNameSchema = z
  .string("Each skill must be text.")
  .trim()
  .min(1, "Skill names cannot be empty.")
  .max(
    MAX_SKILL_LENGTH,
    `Skill names must be at most ${MAX_SKILL_LENGTH} characters.`,
  )
  .regex(
    /^[\p{L}\p{N}+#.&\/_ '-]+$/u,
    "Skill names may use letters, numbers, spaces, and + # . & / _ ' - only.",
  )
  .refine(
    (value) => /[\p{L}\p{N}]/u.test(value),
    "A skill name needs at least one letter or number.",
  )
  .transform(collapseSpaces);
