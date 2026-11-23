import { Router } from "express";
import { requireAdmin, requireAuth } from "../../middleware/requireAuth";
import * as controller from "./admin.controller";

export const adminRouter = Router();
adminRouter.use((_req, res, next) => { res.setHeader("Cache-Control", "private, no-store"); next(); });
adminRouter.use(requireAuth, requireAdmin);
adminRouter.get("/overview", controller.overview);
adminRouter.get("/users", controller.users);
adminRouter.patch("/users/:userId/status", controller.updateUserStatus);
adminRouter.get("/reports", controller.reports);
adminRouter.patch("/reports/:type/:reportId", controller.resolveReport);
adminRouter.get("/history", controller.history);
adminRouter.get("/appeals", controller.appeals);
adminRouter.patch("/appeals/:appealId", controller.resolveAppeal);
adminRouter.get("/moderation-cases", controller.moderationCases);
adminRouter.patch("/moderation-cases/:caseId", controller.resolveModerationCase);
