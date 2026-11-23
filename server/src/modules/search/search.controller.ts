import type { Request, Response } from "express";
import { AppError } from "../../utils/appError";
import { globalSearchSchema } from "./search.schema";
import { globalSearch } from "./search.service";

export async function search(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new AppError(401, "UNAUTHENTICATED", "Please log in to search SkillBridge.");
  if (!req.user.onboardedAt) throw new AppError(403, "ONBOARDING_REQUIRED", "Complete onboarding before searching SkillBridge.");
  const { q } = globalSearchSchema.parse(req.query);
  res.status(200).json({ data: await globalSearch(req.user.id, q) });
}
