import { Router } from "express";
import { requireAuth, requireWriteAccess } from "../../middleware/requireAuth";
import * as controller from "./calls.controller";
import { uploadSingleAudioMessage } from "../../middleware/uploadAudioMessage";
import { uploadAudioMessage } from "../messages/messages.audio.controller";

export const callsRouter = Router();
callsRouter.use((_req, res, next) => { res.setHeader("Cache-Control", "private, no-store"); next(); });
callsRouter.use(requireAuth);
callsRouter.get("/community/:communityId/active", controller.activeCommunityCall);
callsRouter.post("/", requireWriteAccess, controller.create);
callsRouter.post("/audio", requireWriteAccess, uploadSingleAudioMessage, uploadAudioMessage);
callsRouter.get("/:callId/messages", controller.listMessages);
callsRouter.post("/:callId/messages", requireWriteAccess, controller.createMessage);
callsRouter.get("/:callId", controller.get);
callsRouter.post("/:callId/join", requireWriteAccess, controller.join);
callsRouter.post("/:callId/signal", requireWriteAccess, controller.signal);
callsRouter.post("/:callId/leave", controller.leave);
