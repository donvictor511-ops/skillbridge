import { z } from "zod";
import { isSafeHttpsUrl } from "../../utils/url";
import {
  COMPANY_SIZE_RANGES,
  MAX_COMPANY_ABOUT,
  MAX_COMPANY_NAME,
  MAX_INDUSTRY,
  MAX_PROJECT_DESCRIPTION,
  MAX_PROJECT_SKILLS,
  MAX_PROJECT_TITLE,
  MAX_URL_LENGTH,
} from "./profile.options";
import {
  optionalLine,
  optionalParagraph,
  requiredText,
} from "./profile.sections.schema";

// Optional https link: missing, null, or "" all become null.
function optionalHttpsUrl(label: string) {
  return z
    .string()
    .trim()
    .max(MAX_URL_LENGTH, `${label} is too long.`)
    .refine(
      (value) => value === "" || isSafeHttpsUrl(value),
      `${label} must be a full link starting with https://`,
    )
    .nullish()
    .transform((value) => (value ? value : null));
}

// Required paragraph: keeps line breaks, but not endless blank lines.
function requiredParagraph(maxLength: number, label: string) {
  return z
    .string(`${label} is required.`)
    .trim()
    .min(1, `${label} is required.`)
    .max(maxLength, `${label} must be at most ${maxLength} characters.`)
    .transform((value) =>
      value.replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n"),
    );
}

// A portfolio project. Used for both "add" (POST) and "replace" (PUT).
// Unknown fields (like id or profileId) are dropped.
export const projectSchema = z.object({
  title: requiredText(MAX_PROJECT_TITLE, "Project title"),
  description: requiredParagraph(MAX_PROJECT_DESCRIPTION, "Description"),
  projectUrl: optionalHttpsUrl("Project link"),
  imageUrl: optionalHttpsUrl("Image link"),
  // Skill ids (from your own profile), not names.
  skillIds: z
    .array(z.uuid("Choose skills from your own skills list."))
    .max(MAX_PROJECT_SKILLS, `Choose at most ${MAX_PROJECT_SKILLS} skills.`)
    .optional()
    .transform((value) => Array.from(new Set(value ?? []))),
});

export type ProjectInput = z.infer<typeof projectSchema>;

// The API uses friendly sizes ("11-50"). The database uses enum names.
const SIZE_RANGE_TO_DB = {
  "1-10": "size_1_10",
  "11-50": "size_11_50",
  "51-200": "size_51_200",
  "201-500": "size_201_500",
  "501+": "size_501_plus",
} as const;

// Company details for a client or business account.
export const businessSchema = z.object({
  companyName: requiredText(MAX_COMPANY_NAME, "Company name"),
  websiteUrl: optionalHttpsUrl("Website"),
  industry: optionalLine(MAX_INDUSTRY, "Industry"),
  sizeRange: z
    .enum(COMPANY_SIZE_RANGES, "Choose a valid company size.")
    .nullish()
    .transform((value) => (value ? SIZE_RANGE_TO_DB[value] : null)),
  about: optionalParagraph(MAX_COMPANY_ABOUT, "About the company"),
});

export type BusinessInput = z.infer<typeof businessSchema>;
