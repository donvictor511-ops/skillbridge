import { z } from "zod";

export const aiAssistSchema = z.object({
  task: z.enum([
    "profile_improvement",
    "cv_assistance",
    "job_recommendations",
    "project_recommendations",
    "writing_assistance",
    "skill_recommendations",
    "professional_matching",
  ]),
  draft: z.string().trim().max(6000).optional(),
  target: z.string().trim().max(1400).optional(),
  writingType: z.enum(["post", "proposal"]).optional(),
});

export type AiAssistInput = z.infer<typeof aiAssistSchema>;
