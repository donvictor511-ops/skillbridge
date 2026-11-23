import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth";
import { getDiscoverProfiles, getRecommendedProfiles } from "./discover.controller";

const discoverRouter = Router();

// Discovery results contain private, user-specific information.
discoverRouter.use((_req, res, next) => {
  res.setHeader("Cache-Control", "private, no-store");
  next();
});

// All discovery requests require authentication.
discoverRouter.get("/", requireAuth, getDiscoverProfiles);
discoverRouter.get("/recommendations", requireAuth, getRecommendedProfiles);

export { discoverRouter };
