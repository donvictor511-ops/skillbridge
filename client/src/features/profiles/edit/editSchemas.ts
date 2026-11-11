import { z } from "zod";
import { isSafeHttpsUrl } from "../../../lib/url";
import { MAX_INTERESTS } from "../../onboarding/onboardingOptions";

// These checks give FAST feedback. The server repeats every one of them and is
// the real authority. The numbers must match the server.
export const MAX_EXPERIENCES = 20;
export const MAX_EDUCATION_ENTRIES = 10;

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

function optionalHttpsUrl(label: string) {
  return z
    .string()
    .trim()
    .max(2048, `${label} is too long.`)
    .refine(
      (value) => value === "" || isSafeHttpsUrl(value),
      `${label} must be a full link starting with https://`,
    );
}

export const basicsFormSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Enter your name or business name.")
    .max(80, "Use at most 80 characters."),
  headline: z.string().trim().max(120, "Use at most 120 characters."),
  location: z.string().trim().max(80, "Use at most 80 characters."),
  bio: z.string().trim().max(2000, "Use at most 2000 characters."),
  avatarUrl: optionalHttpsUrl("Photo link"),
  coverUrl: optionalHttpsUrl("Cover image link"),
  visibility: z.enum(["public", "members", "private"]),
  interests: z
    .array(z.string())
    .max(MAX_INTERESTS, `Choose at most ${MAX_INTERESTS} interests.`),
  goals: z.array(z.string()).min(1, "Choose at least one goal."),
});

export const experienceFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Enter the job title.")
      .max(100, "Use at most 100 characters."),
    company: z
      .string()
      .trim()
      .min(1, "Enter the company.")
      .max(100, "Use at most 100 characters."),
    location: z.string().trim().max(100, "Use at most 100 characters."),
    startDate: z
      .string()
      .regex(MONTH_PATTERN, "Choose the start month, like 2023-03."),
    isCurrent: z.boolean(),
    endDate: z.string(),
    description: z.string().trim().max(2000, "Use at most 2000 characters."),
  })
  .superRefine((value, ctx) => {
    if (value.isCurrent) {
      return;
    }

    if (!MONTH_PATTERN.test(value.endDate)) {
      ctx.addIssue({
        code: "custom",
        message:
          'Choose the end month, like 2024-06, or tick "I currently work here".',
        path: ["endDate"],
      });
      return;
    }

    // "YYYY-MM" text sorts in date order, so we can compare it directly.
    if (value.endDate < value.startDate) {
      ctx.addIssue({
        code: "custom",
        message: "End date cannot be before the start date.",
        path: ["endDate"],
      });
    }
  });

export type ExperienceFormValues = z.infer<typeof experienceFormSchema>;

function yearText(label: string) {
  return z
    .string()
    .trim()
    .refine(
      (value) =>
        value === "" ||
        (/^\d{4}$/.test(value) &&
          Number(value) >= 1900 &&
          Number(value) <= 2100),
      `${label} must be a year between 1900 and 2100.`,
    );
}

export const educationFormSchema = z
  .object({
    school: z
      .string()
      .trim()
      .min(1, "Enter the school or course.")
      .max(120, "Use at most 120 characters."),
    degree: z.string().trim().max(100, "Use at most 100 characters."),
    fieldOfStudy: z.string().trim().max(100, "Use at most 100 characters."),
    startYear: yearText("Start year"),
    endYear: yearText("End year"),
    description: z.string().trim().max(1000, "Use at most 1000 characters."),
  })
  .superRefine((value, ctx) => {
    if (
      value.startYear !== "" &&
      value.endYear !== "" &&
      Number(value.endYear) < Number(value.startYear)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "End year cannot be before the start year.",
        path: ["endYear"],
      });
    }
  });

export type EducationFormValues = z.infer<typeof educationFormSchema>;
