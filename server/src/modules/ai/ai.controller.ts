import type { Request, Response } from "express";
import { AppError } from "../../utils/appError";
import { env } from "../../config/env";
import { aiAssistSchema } from "./ai.schema";
import { assistWithCareer } from "./ai.service";

export async function postAiAssistance(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new AppError(401, "UNAUTHENTICATED", "Please log in to use AI assistance.");
  if (!req.user.onboardedAt) throw new AppError(403, "ONBOARDING_REQUIRED", "Complete onboarding before using AI assistance.");
  const input = aiAssistSchema.parse(req.body);
  res.status(200).json({ data: await assistWithCareer(req.user.id, input) });
}

export async function getAiStatus(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new AppError(401, "UNAUTHENTICATED", "Please log in to use AI assistance.");
  res.status(200).json({ data: { configured: Boolean(env.geminiApiKey) } });
}
