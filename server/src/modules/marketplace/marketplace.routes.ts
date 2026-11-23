import { Router } from "express";
import { requireAuth, requireWriteAccess } from "../../middleware/requireAuth";
import { uploadSingleJobCv } from "../../middleware/uploadJobCv";
import * as controller from "./marketplace.controller";

export const marketplaceRouter = Router();
marketplaceRouter.use((_req, res, next) => {
  res.setHeader("Cache-Control", "private, no-store");
  next();
});
marketplaceRouter.use(requireAuth);

marketplaceRouter.get("/jobs", controller.listJobs);
marketplaceRouter.post("/jobs", requireWriteAccess, controller.createJob);
marketplaceRouter.get("/jobs/applications/mine", controller.mineApplications);
marketplaceRouter.get("/jobs/applications/:applicationId/cv", controller.downloadApplicationCv);
marketplaceRouter.get("/jobs/:listingId", controller.getJob);
marketplaceRouter.patch("/jobs/:listingId", requireWriteAccess, controller.updateJob);
marketplaceRouter.post("/jobs/:listingId/applications", requireWriteAccess, uploadSingleJobCv, controller.applyToJob);
marketplaceRouter.patch("/jobs/:listingId/applications/:applicationId", requireWriteAccess, controller.updateApplication);

marketplaceRouter.get("/projects", controller.listProjects);
marketplaceRouter.post("/projects", requireWriteAccess, controller.createProject);
marketplaceRouter.get("/projects/proposals/mine", controller.mineProposals);
marketplaceRouter.get("/projects/:listingId", controller.getProject);
marketplaceRouter.patch("/projects/:listingId", requireWriteAccess, controller.updateProject);
marketplaceRouter.post("/projects/:listingId/proposals", requireWriteAccess, controller.proposeToProject);
marketplaceRouter.patch("/projects/:listingId/proposals/:proposalId", requireWriteAccess, controller.updateProposal);
