import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth";
import { getAiStatus, postAiAssistance } from "./ai.controller";

export const aiRouter = Router();
aiRouter.use((_req, res, next) => {
  res.setHeader("Cache-Control", "private, no-store");
  next();
});
aiRouter.use(requireAuth);
aiRouter.get("/status", getAiStatus);
aiRouter.post("/assist", postAiAssistance);
