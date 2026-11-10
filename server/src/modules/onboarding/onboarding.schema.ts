import { z } from "zod";
import { skillNameSchema } from "../skills/skill.schema";
import {
  CAPABILITIES,
  GOALS,
  INTERESTS,
  MAX_INTERESTS,
  MAX_SKILLS,
} from "./onboarding.options";

function collapseSpaces(value: string): string {
  return value.replace(/\s+/g, " ");
}

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

// Optional text: empty becomes null.
function optionalText(maxLength: number, label: string) {
  return z
    .string()
    .trim()
    .max(maxLength, `${label} must be at most ${maxLength} characters.`)
    .optional()
    .transform((value) => (value ? collapseSpaces(value) : null));
}

export const onboardingSchema = z.object({
  capabilities: z
    .array(z.enum(CAPABILITIES, "Choose a valid account type."))
    .min(1, "Choose at least one account type.")
    .max(CAPABILITIES.length, "Choose a valid account type.")
    .transform(unique),

  displayName: z
    .string("Enter your name.")
    .trim()
    .min(1, "Enter your name.")
    .max(80, "Name must be at most 80 characters.")
    .transform(collapseSpaces),

  headline: optionalText(120, "Headline"),
  location: optionalText(80, "Location"),

  skills: z
    .array(skillNameSchema)
    .max(MAX_SKILLS, `Add at most ${MAX_SKILLS} skills.`),

  interests: z
    .array(z.enum(INTERESTS, "Choose valid interests."))
    .max(MAX_INTERESTS, `Choose at most ${MAX_INTERESTS} interests.`)
    .transform(unique),

  goals: z
    .array(z.enum(GOALS, "Choose valid goals."))
    .min(1, "Choose at least one goal.")
    .transform(unique),
});

// The type AFTER validation and cleaning (trimmed, deduplicated, empty -> null).
export type OnboardingInput = z.infer<typeof onboardingSchema>;
