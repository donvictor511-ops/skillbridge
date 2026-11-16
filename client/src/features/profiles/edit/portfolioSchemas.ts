import { z } from "zod";
import { isSafeHttpsUrl } from "../../../lib/url";

// These checks give FAST feedback. The server repeats every one of them and is
// the real authority. The numbers must match the server.
export const MAX_PROJECTS = 20;
export const MAX_PROJECT_SKILLS = 10;

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

export const projectFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Enter the project title.")
    .max(100, "Use at most 100 characters."),
  description: z
    .string()
    .trim()
    .min(1, "Describe the project in a few sentences.")
    .max(2000, "Use at most 2000 characters."),
  projectUrl: optionalHttpsUrl("Project link"),
  imageUrl: optionalHttpsUrl("Image link"),
  skillIds: z
    .array(z.string())
    .max(MAX_PROJECT_SKILLS, `Choose at most ${MAX_PROJECT_SKILLS} skills.`),
});

export type ProjectFormValues = z.infer<typeof projectFormSchema>;

// Company sizes. The values match the API.
export const companySizeOptions = [
  { value: "1-10", label: "1-10 people" },
  { value: "11-50", label: "11-50 people" },
  { value: "51-200", label: "51-200 people" },
  { value: "201-500", label: "201-500 people" },
  { value: "501+", label: "501 or more people" },
] as const;

export const businessFormSchema = z.object({
  companyName: z
    .string()
    .trim()
    .min(1, "Enter the company name.")
    .max(120, "Use at most 120 characters."),
  websiteUrl: optionalHttpsUrl("Website"),
  industry: z.string().trim().max(100, "Use at most 100 characters."),
  // "" means "not set".
  sizeRange: z.enum(["", "1-10", "11-50", "51-200", "201-500", "501+"]),
  about: z.string().trim().max(2000, "Use at most 2000 characters."),
});

export type BusinessFormValues = z.infer<typeof businessFormSchema>;
