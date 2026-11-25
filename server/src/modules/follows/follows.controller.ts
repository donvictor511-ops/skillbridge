import type { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../utils/appError";
import { followUser, unfollowUser } from "./follows.service";

const paramsSchema = z.object({ userId: z.uuid() });

function getUserId(req: Request): string {
  if (!req.user) throw new AppError(401, "UNAUTHENTICATED", "Please log in to follow members.");
  if (!req.user.onboardedAt) throw new AppError(403, "ONBOARDING_REQUIRED", "Complete onboarding before following members.");
  return req.user.id;
}

export async function createFollow(req: Request, res: Response): Promise<void> {
  const followerId = getUserId(req);
  const { userId: followedId } = paramsSchema.parse(req.params);
  const follow = await followUser(followerId, followedId);
  res.status(201).json({ data: { ...follow, createdAt: follow.createdAt.toISOString() } });
}

export async function deleteFollow(req: Request, res: Response): Promise<void> {
  const followerId = getUserId(req);
  const { userId: followedId } = paramsSchema.parse(req.params);
  await unfollowUser(followerId, followedId);
  res.status(204).end();
}
