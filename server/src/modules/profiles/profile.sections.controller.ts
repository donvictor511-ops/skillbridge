import type { Request, Response } from "express";
import { getSessionUser, markNotCacheable } from "./profile.http";
import {
  educationSchema,
  experienceSchema,
  sectionIdSchema,
} from "./profile.sections.schema";
import {
  addEducation,
  addExperience,
  educationNotFound,
  experienceNotFound,
  removeEducation,
  removeExperience,
  replaceEducation,
  replaceExperience,
} from "./profile.sections.service";

// ---------------------------------------------------------------- experience

export async function createExperienceHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const user = getSessionUser(req);
  const input = experienceSchema.parse(req.body);
  const profile = await addExperience(user.id, input);

  markNotCacheable(res);
  res.status(201).json({ data: { profile } });
}

export async function replaceExperienceHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const user = getSessionUser(req);

  // A malformed id gets the same answer as an id that is not yours.
  const rawId: unknown = req.params.experienceId;
  const id = sectionIdSchema.safeParse(rawId);
  if (!id.success) {
    throw experienceNotFound();
  }

  const input = experienceSchema.parse(req.body);
  const profile = await replaceExperience(user.id, id.data, input);

  markNotCacheable(res);
  res.status(200).json({ data: { profile } });
}

export async function deleteExperienceHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const user = getSessionUser(req);

  const rawId: unknown = req.params.experienceId;
  const id = sectionIdSchema.safeParse(rawId);
  if (!id.success) {
    throw experienceNotFound();
  }

  const profile = await removeExperience(user.id, id.data);

  markNotCacheable(res);
  res.status(200).json({ data: { profile } });
}

// ----------------------------------------------------------------- education

export async function createEducationHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const user = getSessionUser(req);
  const input = educationSchema.parse(req.body);
  const profile = await addEducation(user.id, input);

  markNotCacheable(res);
  res.status(201).json({ data: { profile } });
}

export async function replaceEducationHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const user = getSessionUser(req);

  const rawId: unknown = req.params.educationId;
  const id = sectionIdSchema.safeParse(rawId);
  if (!id.success) {
    throw educationNotFound();
  }

  const input = educationSchema.parse(req.body);
  const profile = await replaceEducation(user.id, id.data, input);

  markNotCacheable(res);
  res.status(200).json({ data: { profile } });
}

export async function deleteEducationHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const user = getSessionUser(req);

  const rawId: unknown = req.params.educationId;
  const id = sectionIdSchema.safeParse(rawId);
  if (!id.success) {
    throw educationNotFound();
  }

  const profile = await removeEducation(user.id, id.data);

  markNotCacheable(res);
  res.status(200).json({ data: { profile } });
}
