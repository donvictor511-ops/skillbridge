import { Router } from "express";
import { requireAuth, requireWriteAccess } from "../../middleware/requireAuth";
import { createFollow, deleteFollow } from "./follows.controller";

export const followsRouter = Router();
followsRouter.use((_req, res, next) => {
  res.setHeader("Cache-Control", "private, no-store");
  next();
});
followsRouter.use(requireAuth);
followsRouter.post("/:userId", requireWriteAccess, createFollow);
followsRouter.delete("/:userId", requireWriteAccess, deleteFollow);
