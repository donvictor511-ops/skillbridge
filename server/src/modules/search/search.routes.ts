import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth";
import { search } from "./search.controller";

export const searchRouter = Router();
searchRouter.use((_req, res, next) => { res.setHeader("Cache-Control", "private, no-store"); next(); });
searchRouter.get("/", requireAuth, search);
