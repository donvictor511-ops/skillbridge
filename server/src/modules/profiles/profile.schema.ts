import { z } from "zod";
import { isSafeHttpsUrl } from "../../utils/url";
import {
  GOALS,
  INTERESTS,
  MAX_INTERESTS,
  MAX_SKILLS,
} from "../onboarding/onboarding.options";
import { skillNameSchema } from "../skills/skill.schema";
import {
  MAX_BIO,
  MAX_DISPLAY_NAME,
  MAX_HEADLINE,
  MAX_LOCATION,
  MAX_URL_LENGTH,
  VISIBILITIES,
} from "./profile.options";

function collapseSpaces(value: string): string {
  return value.replace(/\s+/g, " ");
}

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

// In an update (PATCH):
//   field missing  -> leave it unchanged
//   null or ""     -> clear it
//   some text      -> set it
function clearableText(maxLength: number, label: string) {
  return z
    .union([
      z
        .string()
        .trim()
        .max(maxLength, `${label} must be at most ${maxLength} characters.`)
        .transform((value) => (value === "" ? null : collapseSpaces(value))),
      z.null(),
    ])
    .optional();
}

// A bio may keep its line breaks (but not endless blank lines).
const bioField = z
  .union([
    z
      .string()
      .trim()
      .max(MAX_BIO, `Bio must be at most ${MAX_BIO} characters.`)
      .transform((value) =>
        value === ""
          ? null
          : value.replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n"),
      ),
    z.null(),
  ])
  .optional();

function clearableHttpsUrl(label: string) {
  return z
    .union([
      z
        .string()
        .trim()
        .max(MAX_URL_LENGTH, `${label} is too long.`)
        .refine(
          (value) => value === "" || isSafeHttpsUrl(value),
          `${label} must be a full link starting with https://`,
        )
        .transform((value) => (value === "" ? null : value)),
      z.null(),
    ])
    .optional();
}

export const updateProfileSchema = z
  .object({
    displayName: z
      .string("Enter your name.")
      .trim()
      .min(1, "Enter your name.")
      .max(
        MAX_DISPLAY_NAME,
        `Name must be at most ${MAX_DISPLAY_NAME} characters.`,
      )
      .transform(collapseSpaces)
      .optional(),
    headline: clearableText(MAX_HEADLINE, "Headline"),
    location: clearableText(MAX_LOCATION, "Location"),
    bio: bioField,
    avatarUrl: clearableHttpsUrl("Photo link"),
    coverUrl: clearableHttpsUrl("Cover image link"),
    visibility: z
      .enum(VISIBILITIES, "Choose public, members, or private.")
      .optional(),
    interests: z
      .array(z.enum(INTERESTS, "Choose valid interests."))
      .max(MAX_INTERESTS, `Choose at most ${MAX_INTERESTS} interests.`)
      .transform(unique)
      .optional(),
    goals: z
      .array(z.enum(GOALS, "Choose valid goals."))
      .min(1, "Choose at least one goal.")
      .transform(unique)
      .optional(),
    spokenLanguages: z.array(z.string().trim().min(1).max(50)).max(20).transform(unique).optional(),
    allowCommunityInvites: z.boolean().optional(),
  })
  .refine(
    (value) => Object.values(value).some((field) => field !== undefined),
    "Send at least one field to update.",
  );

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const updateSkillsSchema = z.object({
  skills: z
    .array(skillNameSchema)
    .max(MAX_SKILLS, `Add at most ${MAX_SKILLS} skills.`),
});

export type UpdateSkillsInput = z.infer<typeof updateSkillsSchema>;

// The :userId in the URL.
export const userIdSchema = z.uuid();
