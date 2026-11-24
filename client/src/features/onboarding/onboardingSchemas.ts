import { z } from "zod";
import { MAX_INTERESTS, MAX_SKILLS } from "./onboardingOptions";
import { isSafeHttpsUrl } from "../../lib/url";

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

export const showcaseSchema = z
  .object({
    projectTitle: z.string().trim().max(100, "Use at most 100 characters."),
    projectDescription: z.string().trim().max(2000, "Use at most 2000 characters."),
    projectUrl: z.string().trim().max(2048, "Project link is too long.").refine(
      (value) => value === "" || isSafeHttpsUrl(value),
      "Project link must start with https://",
    ),
    projectSkills: z.array(z.string()).max(10, "Choose at most 10 skills."),
  })
  .superRefine((value, context) => {
    const hasTitle = value.projectTitle.length > 0;
    const hasDescription = value.projectDescription.length > 0;
    const hasProjectDetails = hasTitle || hasDescription || value.projectUrl.length > 0 || value.projectSkills.length > 0;
    if (hasProjectDetails && !hasTitle) {
      context.addIssue({
        code: "custom",
        path: ["projectTitle"],
        message: "Add a project title, or clear the project details to skip.",
      });
    }
    if (hasProjectDetails && !hasDescription) {
      context.addIssue({
        code: "custom",
        path: ["projectDescription"],
        message: "Add a short description, or clear the project details to skip.",
      });
    }
  });

export type ShowcaseDraft = z.infer<typeof showcaseSchema>;
