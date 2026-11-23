import type { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../utils/appError";
import * as service from "./admin.service";

function adminId(req: Request): string {
  if (!req.user || req.user.role !== "admin") throw new AppError(403, "ADMIN_REQUIRED", "Administrator access is required.");
  return req.user.id;
}

const pageSchema = z.object({ page: z.coerce.number().int().min(1).default(1), search: z.string().trim().max(120).optional(), status: z.enum(["pending", "reviewed", "dismissed", "actioned", "all"]).default("pending") });
const statusSchema = z.object({ action: z.enum(["suspend", "restrict", "restore"]), reason: z.string().trim().min(5).max(1000), durationDays: z.coerce.number().int().min(1).max(365).default(7) });
const resolutionSchema = z.object({ action: z.enum(["review", "dismiss", "remove"]), reason: z.string().trim().min(3).max(1000) });
const appealResolutionSchema = z.object({ action: z.enum(["accept", "reject"]), note: z.string().trim().min(5).max(1000) });
const moderationResolutionSchema = z.object({ action: z.enum(["approve", "remove"]), note: z.string().trim().min(5).max(1000) });

export async function overview(req: Request, res: Response): Promise<void> {
  adminId(req);
  res.status(200).json({ data: await service.getOverview() });
}

export async function users(req: Request, res: Response): Promise<void> {
  adminId(req);
  const query = pageSchema.pick({ page: true, search: true }).parse(req.query);
  res.status(200).json({ data: await service.listUsers(query.page, query.search ?? "") });
}

export async function updateUserStatus(req: Request, res: Response): Promise<void> {
  const actorId = adminId(req);
  const userId = z.uuid().parse(req.params.userId);
  const input = statusSchema.parse(req.body);
  res.status(200).json({ data: await service.updateUserStatus(actorId, userId, input) });
}

export async function reports(req: Request, res: Response): Promise<void> {
  adminId(req);
  const query = pageSchema.parse(req.query);
  res.status(200).json({ data: await service.listReports(query.page, query.status) });
}

export async function resolveReport(req: Request, res: Response): Promise<void> {
  const actorId = adminId(req);
  const type = z.enum(["user", "post", "community"]).parse(req.params.type);
  const reportId = z.uuid().parse(req.params.reportId);
  const input = resolutionSchema.parse(req.body);
  await service.resolveReport(actorId, type, reportId, input);
  res.status(204).send();
}

export async function history(req: Request, res: Response): Promise<void> {
  adminId(req);
  const page = z.coerce.number().int().min(1).default(1).parse(req.query.page);
  res.status(200).json({ data: await service.listHistory(page) });
}

export async function appeals(req: Request, res: Response): Promise<void> {
  adminId(req);
  const page = z.coerce.number().int().min(1).default(1).parse(req.query.page);
  res.status(200).json({ data: await service.listAccountAppeals(page) });
}

export async function resolveAppeal(req: Request, res: Response): Promise<void> {
  const actorId = adminId(req);
  const appealId = z.uuid().parse(req.params.appealId);
  const input = appealResolutionSchema.parse(req.body);
  await service.resolveAccountAppeal(actorId, appealId, input);
  res.status(204).send();
}

export async function moderationCases(req: Request, res: Response): Promise<void> {
  adminId(req);
  const page = z.coerce.number().int().min(1).default(1).parse(req.query.page);
  res.status(200).json({ data: await service.listModerationCases(page) });
}

export async function resolveModerationCase(req: Request, res: Response): Promise<void> {
  const actorId = adminId(req);
  const caseId = z.uuid().parse(req.params.caseId);
  const input = moderationResolutionSchema.parse(req.body);
  await service.resolveModerationCase(actorId, caseId, input);
  res.status(204).send();
}
