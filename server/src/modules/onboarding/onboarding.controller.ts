import type { Request, Response } from "express";
import { AppError } from "../../utils/appError";
import { onboardingSchema } from "./onboarding.schema";
import { completeOnboarding } from "./onboarding.service";

// Protected by requireAuth, which sets req.user.
export async function completeOnboardingHandler(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user) {
    throw new AppError(401, "UNAUTHENTICATED", "Please log in to continue.");
  }

  const input = onboardingSchema.parse(req.body);

  // We always use the id from the SESSION, never an id sent by the client.
  const user = await completeOnboarding(req.user.id, input);

  res.status(201).json({ data: { user } });
}
