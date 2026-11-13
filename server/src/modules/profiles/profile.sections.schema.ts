import { z } from "zod";
import {
  MAX_COMPANY,
  MAX_DEGREE,
  MAX_EDUCATION_DESCRIPTION,
  MAX_EXPERIENCE_DESCRIPTION,
  MAX_FIELD_OF_STUDY,
  MAX_JOB_TITLE,
  MAX_SCHOOL,
  MAX_SECTION_LOCATION,
  MAX_YEAR,
  MIN_YEAR,
} from "./profile.options";

function collapseSpaces(value: string): string {
  return value.replace(/\s+/g, " ");
}

// Required single-line text: trimmed, repeated spaces collapsed.
export function requiredText(maxLength: number, label: string) {
  return z
    .string(`${label} is required.`)
    .trim()
    .min(1, `${label} is required.`)
    .max(maxLength, `${label} must be at most ${maxLength} characters.`)
    .transform(collapseSpaces);
}

// Optional single-line text: missing, null, or "" all become null.
export function optionalLine(maxLength: number, label: string) {
  return z
    .string()
    .trim()
    .max(maxLength, `${label} must be at most ${maxLength} characters.`)
    .nullish()
    .transform((value) => (value ? collapseSpaces(value) : null));
}

// Optional paragraph: keeps line breaks, but not endless blank lines.
export function optionalParagraph(maxLength: number, label: string) {
  return z
    .string()
    .trim()
    .max(maxLength, `${label} must be at most ${maxLength} characters.`)
    .nullish()
    .transform((value) =>
      value ? value.replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n") : null,
    );
}

// A month like "2023-03" becomes a Date on the first day of that month (UTC).
function monthToDate(value: string): Date {
  return new Date(`${value}-01T00:00:00.000Z`);
}

function monthField(label: string) {
  return z
    .string(`${label} is required.`)
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, `${label} must be a month, like 2023-03.`)
    .refine((value) => {
      const year = Number(value.slice(0, 4));
      return year >= MIN_YEAR && year <= MAX_YEAR;
    }, `${label} must be between ${MIN_YEAR} and ${MAX_YEAR}.`)
    .transform(monthToDate);
}

function yearField(label: string) {
  return z
    .number(`${label} must be a year, like 2020.`)
    .int(`${label} must be a whole number.`)
    .min(MIN_YEAR, `${label} must be between ${MIN_YEAR} and ${MAX_YEAR}.`)
    .max(MAX_YEAR, `${label} must be between ${MIN_YEAR} and ${MAX_YEAR}.`)
    .nullish()
    .transform((value) => value ?? null);
}

// A job. Used for both "add" (POST) and "replace" (PUT).
// Unknown fields (like id or profileId) are dropped.
export const experienceSchema = z
  .object({
    title: requiredText(MAX_JOB_TITLE, "Job title"),
    company: requiredText(MAX_COMPANY, "Company"),
    location: optionalLine(MAX_SECTION_LOCATION, "Location"),
    startDate: monthField("Start date"),
    // No end date means "this is my current job".
    endDate: monthField("End date")
      .nullish()
      .transform((value) => value ?? null),
    description: optionalParagraph(MAX_EXPERIENCE_DESCRIPTION, "Description"),
  })
  .superRefine((value, ctx) => {
    if (
      value.endDate !== null &&
      value.endDate.getTime() < value.startDate.getTime()
    ) {
      ctx.addIssue({
        code: "custom",
        message: "End date cannot be before the start date.",
        path: ["endDate"],
      });
    }
  });

export type ExperienceInput = z.infer<typeof experienceSchema>;

// A school or course.
export const educationSchema = z
  .object({
    school: requiredText(MAX_SCHOOL, "School"),
    degree: optionalLine(MAX_DEGREE, "Degree"),
    fieldOfStudy: optionalLine(MAX_FIELD_OF_STUDY, "Field of study"),
    startYear: yearField("Start year"),
    endYear: yearField("End year"),
    description: optionalParagraph(MAX_EDUCATION_DESCRIPTION, "Description"),
  })
  .superRefine((value, ctx) => {
    if (
      value.startYear !== null &&
      value.endYear !== null &&
      value.endYear < value.startYear
    ) {
      ctx.addIssue({
        code: "custom",
        message: "End year cannot be before the start year.",
        path: ["endYear"],
      });
    }
  });

export type EducationInput = z.infer<typeof educationSchema>;

// The :experienceId or :educationId in the URL.
export const sectionIdSchema = z.uuid();
