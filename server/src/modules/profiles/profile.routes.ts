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
  createProjectHandler,
  deleteBusinessHandler,
  deleteProjectHandler,
  replaceProjectHandler,
  saveBusinessHandler,
} from "./profile.portfolio.controller";
import {
  createEducationHandler,
  createExperienceHandler,
  deleteEducationHandler,
  deleteExperienceHandler,
  replaceEducationHandler,
  replaceExperienceHandler,
} from "./profile.sections.controller";

export const profileRouter = Router();

// Who may see a profile (and what we answer) depends on the cookie. So NOTHING
// from these routes, neither a success nor an error, may be stored by a browser
// or a shared cache. We set the header before any handler runs, so it is
// present on every response, errors included.
profileRouter.use((_req, res, next) => {
  res.setHeader("Cache-Control", "private, no-store");
  next();
});

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

// Portfolio projects (your own work)
profileRouter.post("/me/projects", requireAuth, createProjectHandler);
profileRouter.put(
  "/me/projects/:projectId",
  requireAuth,
  replaceProjectHandler,
);
profileRouter.delete(
  "/me/projects/:projectId",
  requireAuth,
  deleteProjectHandler,
);

// Company details (client or business accounts)
profileRouter.put("/me/business", requireAuth, saveBusinessHandler);
profileRouter.delete("/me/business", requireAuth, deleteBusinessHandler);

profileRouter.get("/:userId", optionalAuth, getProfileById);
