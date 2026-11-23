import { Router } from "express";
import { optionalAuth } from "../../middleware/optionalAuth";
import { requireAuth, requireWriteAccess } from "../../middleware/requireAuth";
import { uploadSingleImage } from "../../middleware/uploadImage";
import {
  getMyProfile,
  getProfileById,
  updateMyProfile,
  updateMySkills,
} from "./profile.controller";
import { uploadMyProfileImage } from "./profile.upload.controller";
import { blockProfileUser, reportProfileUser, unblockProfileUser } from "./profile.moderation.controller";
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
profileRouter.patch("/me", requireAuth, requireWriteAccess, updateMyProfile);
profileRouter.put("/me/skills", requireAuth, requireWriteAccess, updateMySkills);

// Profile image uploads
profileRouter.post(
  "/me/images/:imageType",
  requireAuth,
  requireWriteAccess,
  uploadSingleImage,
  uploadMyProfileImage,
);

// Experience (your own jobs)
profileRouter.post("/me/experiences", requireAuth, requireWriteAccess, createExperienceHandler);
profileRouter.put(
  "/me/experiences/:experienceId",
  requireAuth,
  requireWriteAccess,
  replaceExperienceHandler,
);
profileRouter.delete(
  "/me/experiences/:experienceId",
  requireAuth,
  requireWriteAccess,
  deleteExperienceHandler,
);

// Education (your own schools)
profileRouter.post("/me/education", requireAuth, requireWriteAccess, createEducationHandler);
profileRouter.put(
  "/me/education/:educationId",
  requireAuth,
  requireWriteAccess,
  replaceEducationHandler,
);
profileRouter.delete(
  "/me/education/:educationId",
  requireAuth,
  requireWriteAccess,
  deleteEducationHandler,
);

// Portfolio projects (your own work)
profileRouter.post("/me/projects", requireAuth, requireWriteAccess, createProjectHandler);
profileRouter.put(
  "/me/projects/:projectId",
  requireAuth,
  requireWriteAccess,
  replaceProjectHandler,
);
profileRouter.delete(
  "/me/projects/:projectId",
  requireAuth,
  requireWriteAccess,
  deleteProjectHandler,
);

// Company details (client or business accounts)
profileRouter.put("/me/business", requireAuth, requireWriteAccess, saveBusinessHandler);
profileRouter.delete("/me/business", requireAuth, requireWriteAccess, deleteBusinessHandler);

profileRouter.post("/:userId/block", requireAuth, blockProfileUser);
profileRouter.delete("/:userId/block", requireAuth, unblockProfileUser);
profileRouter.post("/:userId/report", requireAuth, reportProfileUser);

profileRouter.get("/:userId", optionalAuth, getProfileById);
