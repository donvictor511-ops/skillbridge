import type { Request, Response } from "express";
import { discoverQuerySchema } from "./discover.schema";
import { discoverProfiles } from "./discover.service";
import { AppError } from "../../utils/appError";

export async function getDiscoverProfiles(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user) {
    throw new AppError(
      401,
      "UNAUTHENTICATED",
      "Please log in to discover profiles.",
    );
  }

  if (!req.user.onboardedAt) {
    throw new AppError(
      403,
      "ONBOARDING_REQUIRED",
      "Complete onboarding before discovering profiles.",
    );
  }

  const query = discoverQuerySchema.parse(req.query);

  const result = await discoverProfiles(req.user.id, query);

  res.status(200).json({
    data: result,
  });
}
