import { z } from "zod";
import { MAX_INTERESTS, MAX_SKILLS } from "./onboardingOptions";

// Quick checks, one schema per wizard step. They only give fast feedback.
// The server repeats every check and is the real authority.

export const accountTypeSchema = z.object({
  capabilities: z
    .array(z.enum(["professional", "client"]))
    .min(1, "Choose at least one account type."),
});

export const aboutYouSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Enter your name or business name.")
    .max(80, "Use at most 80 characters."),
  headline: z.string().trim().max(120, "Use at most 120 characters."),
  location: z.string().trim().max(80, "Use at most 80 characters."),
});

export const preferencesSchema = z.object({
  goals: z.array(z.string()).min(1, "Choose at least one goal."),
  interests: z
    .array(z.string())
    .max(MAX_INTERESTS, `Choose at most ${MAX_INTERESTS} interests.`),
  skills: z
    .array(z.string())
    .max(MAX_SKILLS, `Add at most ${MAX_SKILLS} skills.`),
});
