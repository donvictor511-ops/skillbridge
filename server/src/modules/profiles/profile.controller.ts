import type { Request, Response } from "express";
import { getSessionUser, markNotCacheable } from "./profile.http";
import {
  updateProfileSchema,
  updateSkillsSchema,
  userIdSchema,
} from "./profile.schema";
import {
  getOwnerProfile,
  getProfileForViewer,
  profileNotFound,
  replaceUserSkills,
  updateProfileBasics,
} from "./profile.service";

export async function getMyProfile(req: Request, res: Response): Promise<void> {
  const user = getSessionUser(req);
  const profile = await getOwnerProfile(user.id);

  markNotCacheable(res);
  res.status(200).json({ data: { profile } });
}

export async function updateMyProfile(
  req: Request,
  res: Response,
): Promise<void> {
  const user = getSessionUser(req);
  const input = updateProfileSchema.parse(req.body);
  const profile = await updateProfileBasics(user.id, input);

  markNotCacheable(res);
  res.status(200).json({ data: { profile } });
}

export async function updateMySkills(
  req: Request,
  res: Response,
): Promise<void> {
  const user = getSessionUser(req);
  const input = updateSkillsSchema.parse(req.body);
  const profile = await replaceUserSkills(user.id, input.skills);

  markNotCacheable(res);
  res.status(200).json({ data: { profile } });
}

// Anyone may call this. optionalAuth tells us who is asking (if anyone).
export async function getProfileById(
  req: Request,
  res: Response,
): Promise<void> {
  const rawId: unknown = req.params.userId;
  const parsedId = userIdSchema.safeParse(rawId);

  // A malformed id gets the same answer as an unknown one.
  if (!parsedId.success) {
    throw profileNotFound();
  }

  const profile = await getProfileForViewer(parsedId.data, req.user);

  markNotCacheable(res);
  res.status(200).json({ data: { profile } });
}
