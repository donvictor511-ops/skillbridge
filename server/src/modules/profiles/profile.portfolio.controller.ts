import type { Request, Response } from "express";
import { getSessionUser, markNotCacheable } from "./profile.http";
import { businessSchema, projectSchema } from "./profile.portfolio.schema";
import {
  addProject,
  projectNotFound,
  removeBusiness,
  removeProject,
  replaceProject,
  saveBusiness,
} from "./profile.portfolio.service";
import { sectionIdSchema } from "./profile.sections.schema";

// -------------------------------------------------------------------- projects

export async function createProjectHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const user = getSessionUser(req);
  const input = projectSchema.parse(req.body);
  const profile = await addProject(user.id, input);

  markNotCacheable(res);
  res.status(201).json({ data: { profile } });
}

export async function replaceProjectHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const user = getSessionUser(req);

  // A malformed id gets the same answer as an id that is not yours.
  const rawId: unknown = req.params.projectId;
  const id = sectionIdSchema.safeParse(rawId);
  if (!id.success) {
    throw projectNotFound();
  }

  const input = projectSchema.parse(req.body);
  const profile = await replaceProject(user.id, id.data, input);

  markNotCacheable(res);
  res.status(200).json({ data: { profile } });
}

export async function deleteProjectHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const user = getSessionUser(req);

  const rawId: unknown = req.params.projectId;
  const id = sectionIdSchema.safeParse(rawId);
  if (!id.success) {
    throw projectNotFound();
  }

  const profile = await removeProject(user.id, id.data);

  markNotCacheable(res);
  res.status(200).json({ data: { profile } });
}

// -------------------------------------------------------------------- company

export async function saveBusinessHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const user = getSessionUser(req);
  const input = businessSchema.parse(req.body);
  const profile = await saveBusiness(user, input);

  markNotCacheable(res);
  res.status(200).json({ data: { profile } });
}

export async function deleteBusinessHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const user = getSessionUser(req);
  const profile = await removeBusiness(user.id);

  markNotCacheable(res);
  res.status(200).json({ data: { profile } });
}
