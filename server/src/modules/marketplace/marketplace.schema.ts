import { z } from "zod";

const categories = ["technology", "design", "marketing", "writing", "data", "business", "customer_support", "other"] as const;
const currencies = ["USD", "NGN", "GBP", "EUR"] as const;
const amount = z.number().positive().max(1_000_000_000);

export const marketplaceListSchema = z.object({
  search: z.string().trim().max(100).optional(),
  category: z.enum(categories).optional(),
  employmentType: z.enum(["full_time", "part_time", "contract", "internship"]).optional(),
  remote: z.enum(["true", "false"]).optional(),
  status: z.enum(["open", "closed", "all"]).default("open"),
  mine: z.enum(["true", "false"]).optional(),
});
export const listingIdSchema = z.object({ listingId: z.uuid() });
const jobFieldsSchema = z.object({
  title: z.string().trim().min(5).max(140),
  description: z.string().trim().min(30).max(8000),
  category: z.enum(categories),
  employmentType: z.enum(["full_time", "part_time", "contract", "internship"]),
  // The client sends null when the optional location field is left empty.
  location: z.string().trim().max(120).nullable().optional().transform((value) => value || null),
  isRemote: z.boolean().default(true),
  budgetMin: amount.optional().nullable(),
  budgetMax: amount.optional().nullable(),
  currency: z.enum(currencies).default("USD"),
});
export const createJobSchema = jobFieldsSchema.refine((value) => value.budgetMin == null || value.budgetMax == null || value.budgetMin <= value.budgetMax, {
  message: "Minimum budget must be no greater than maximum budget.", path: ["budgetMax"],
});
export const updateJobSchema = jobFieldsSchema.partial().extend({ status: z.enum(["open", "closed"]).optional() }).refine((value) => Object.keys(value).length > 0, "Provide at least one field to update.");
export const createApplicationSchema = z.object({ coverLetter: z.string().trim().min(30).max(5000) });
export const updateApplicationSchema = z.object({
  status: z.enum(["reviewing", "accepted", "rejected", "withdrawn"]),
  interview: z.object({
    scheduledAt: z.iso.datetime().refine((value) => new Date(value).getTime() > Date.now(), "Choose a future interview time."),
    durationMinutes: z.coerce.number().int().min(15).max(180),
    mode: z.enum(["audio", "video"]),
    notes: z.string().trim().max(1000).optional(),
  }).optional(),
}).refine((value) => value.status !== "accepted" || Boolean(value.interview), { message: "Set the interview time when accepting an application.", path: ["interview"] });
export const createProjectSchema = z.object({
  title: z.string().trim().min(5).max(140),
  description: z.string().trim().min(30).max(8000),
  category: z.enum(categories),
  skills: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  budget: amount.optional().nullable(),
  currency: z.enum(currencies).default("USD"),
  deliveryTime: z.string().trim().max(100).optional().transform((value) => value || null),
});
export const updateProjectSchema = createProjectSchema.partial().extend({ status: z.enum(["open", "in_progress", "completed", "cancelled"]).optional() }).refine((value) => Object.keys(value).length > 0, "Provide at least one field to update.");
export const createProposalSchema = z.object({
  coverLetter: z.string().trim().min(30).max(5000),
  proposedBudget: amount.optional().nullable(),
  deliveryTime: z.string().trim().max(100).optional().transform((value) => value || null),
});
export const updateProposalSchema = z.object({ status: z.enum(["shortlisted", "accepted", "rejected", "withdrawn"]) });
export const updateProjectStatusSchema = z.object({ status: z.enum(["open", "in_progress", "completed", "cancelled"]) });
