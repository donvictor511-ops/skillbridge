import { Router } from "express";
import { communityGuidelines } from "./guidelines";

export const moderationRouter = Router();

moderationRouter.get("/guidelines", (_req, res) => {
  res.setHeader("Cache-Control", "public, max-age=300");
  res.status(200).json({ data: { rules: communityGuidelines } });
});
