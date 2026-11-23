import { Router } from "express";
import { requireAuth, requireWriteAccess } from "../../middleware/requireAuth";
import * as controller from "./communities.controller";

export const communitiesRouter = Router();
communitiesRouter.use((_req, res, next) => {
  res.setHeader("Cache-Control", "private, no-store");
  next();
});
communitiesRouter.use(requireAuth);
communitiesRouter.get("/invitations", controller.invitations);
communitiesRouter.post("/invitations/:invitationId/respond", requireWriteAccess, controller.respondInvitation);
communitiesRouter.get("/", controller.list);
communitiesRouter.post("/", requireWriteAccess, controller.create);
communitiesRouter.get("/:communityId", controller.detail);
communitiesRouter.patch("/:communityId", requireWriteAccess, controller.update);
communitiesRouter.delete("/:communityId", requireWriteAccess, controller.remove);
communitiesRouter.post("/:communityId/membership", requireWriteAccess, controller.join);
communitiesRouter.post("/:communityId/invitations", requireWriteAccess, controller.invite);
communitiesRouter.delete("/:communityId/membership", controller.leave);
communitiesRouter.delete("/:communityId/members/:memberId", requireWriteAccess, controller.removeMember);
communitiesRouter.patch("/:communityId/members/:memberId", requireWriteAccess, controller.updateMemberRole);
communitiesRouter.post("/:communityId/posts", requireWriteAccess, controller.createPost);
communitiesRouter.delete("/:communityId/posts/:postId", requireWriteAccess, controller.deletePost);
communitiesRouter.post("/:communityId/posts/:postId/comments", requireWriteAccess, controller.createComment);
communitiesRouter.delete("/:communityId/posts/:postId/comments/:commentId", requireWriteAccess, controller.deleteComment);
communitiesRouter.post("/:communityId/reports", controller.report);
communitiesRouter.patch("/:communityId/reports/:reportId", controller.resolveReport);
