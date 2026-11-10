import { Router } from "express";
import { optionalAuth } from "../../middleware/optionalAuth";
import { requireAuth } from "../../middleware/requireAuth";
import {
  getMyProfile,
  getProfileById,
  updateMyProfile,
  updateMySkills,
} from "./profile.controller";
import {
  createEducationHandler,
  createExperienceHandler,
  deleteEducationHandler,
  deleteExperienceHandler,
  replaceEducationHandler,
  replaceExperienceHandler,
} from "./profile.sections.controller";

export const profileRouter = Router();

// Mounted at /api/v1/profiles
//
// IMPORTANT: the "/me" routes MUST come before "/:userId". Otherwise Express
// would treat the word "me" as a user id.
profileRouter.get("/me", requireAuth, getMyProfile);
profileRouter.patch("/me", requireAuth, updateMyProfile);
profileRouter.put("/me/skills", requireAuth, updateMySkills);

// Experience (your own jobs)
profileRouter.post("/me/experiences", requireAuth, createExperienceHandler);
profileRouter.put(
  "/me/experiences/:experienceId",
  requireAuth,
  replaceExperienceHandler,
);
profileRouter.delete(
  "/me/experiences/:experienceId",
  requireAuth,
  deleteExperienceHandler,
);

// Education (your own schools)
profileRouter.post("/me/education", requireAuth, createEducationHandler);
profileRouter.put(
  "/me/education/:educationId",
  requireAuth,
  replaceEducationHandler,
);
profileRouter.delete(
  "/me/education/:educationId",
  requireAuth,
  deleteEducationHandler,
);

profileRouter.get("/:userId", optionalAuth, getProfileById);
