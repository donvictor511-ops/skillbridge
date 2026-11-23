import type { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../utils/appError";
import * as service from "./calls.service";
import { callIdSchema, callMessageSchema, callSignalSchema, communityIdSchema, createCallSchema } from "./calls.schema";

function currentUserId(req: Request) {
  if (!req.user) throw new AppError(401, "UNAUTHENTICATED", "Please sign in to use calls.");
  if (!req.user.onboardedAt) throw new AppError(403, "ONBOARDING_REQUIRED", "Complete onboarding before using calls.");
  return req.user.id;
}

export async function create(req: Request, res: Response): Promise<void> {
  res.status(201).json({ data: await service.createCall(currentUserId(req), createCallSchema.parse(req.body)) });
}
export async function get(req: Request, res: Response): Promise<void> {
  const { callId } = callIdSchema.parse(req.params);
  res.status(200).json({ data: await service.getCall(callId, currentUserId(req)) });
}
export async function listMessages(req: Request, res: Response): Promise<void> {
  const { callId } = callIdSchema.parse(req.params);
  res.status(200).json({ data: await service.listCallMessages(callId, currentUserId(req)) });
}
export async function createMessage(req: Request, res: Response): Promise<void> {
  const { callId } = callIdSchema.parse(req.params);
  res.status(201).json({ data: await service.createCallMessage(callId, currentUserId(req), callMessageSchema.parse(req.body)) });
}
export async function join(req: Request, res: Response): Promise<void> {
  const { callId } = callIdSchema.parse(req.params);
  res.status(200).json({ data: await service.joinCall(callId, currentUserId(req)) });
}
export async function signal(req: Request, res: Response): Promise<void> {
  const { callId } = callIdSchema.parse(req.params);
  const body = callSignalSchema.parse(req.body);
  await service.relaySignal(callId, currentUserId(req), body.toUserId, body.signal);
  res.status(204).send();
}
export async function leave(req: Request, res: Response): Promise<void> {
  const { callId } = callIdSchema.parse(req.params);
  const { decline } = z.object({ decline: z.boolean().optional() }).parse(req.body ?? {});
  await service.leaveCall(callId, currentUserId(req), decline);
  res.status(204).send();
}
export async function activeCommunityCall(req: Request, res: Response): Promise<void> {
  const { communityId } = communityIdSchema.parse(req.params);
  res.status(200).json({ data: await service.getActiveCommunityCall(communityId, currentUserId(req)) });
}
