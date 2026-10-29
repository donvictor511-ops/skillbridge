import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth";
import { completeOnboardingHandler } from "./onboarding.controller";

export const onboardingRouter = Router();

// Mounted at /api/v1/onboarding
onboardingRouter.post("/", requireAuth, completeOnboardingHandler);
