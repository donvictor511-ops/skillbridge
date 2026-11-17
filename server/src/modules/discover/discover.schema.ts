import { z } from "zod";
import { CAPABILITIES } from "../onboarding/onboarding.options";

export const discoverQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),

  skill: z.string().trim().min(1).max(40).optional(),

  location: z.string().trim().min(1).max(80).optional(),

  accountType: z.enum(CAPABILITIES).optional(),

  page: z.coerce.number().int().min(1).default(1),

  limit: z.coerce.number().int().min(1).max(30).default(12),
});

export type DiscoverQuery = z.infer<typeof discoverQuerySchema>;
