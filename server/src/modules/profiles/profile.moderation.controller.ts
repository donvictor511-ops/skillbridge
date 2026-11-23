import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { AppError } from "../../utils/appError";
import { notifyAdministrators } from "../notifications/notifications.service";
import { getSessionUser, markNotCacheable } from "./profile.http";
import { userIdSchema } from "./profile.schema";

const reportSchema = z.object({
  reason: z.enum(["spam", "harassment", "inappropriate_content", "impersonation", "other"]),
  details: z.string().trim().max(1000).optional().transform((value) => value || null),
});

function targetId(req: Request): string {
  const parsed = userIdSchema.safeParse(req.params.userId);
  if (!parsed.success) throw new AppError(404, "PROFILE_NOT_FOUND", "Profile not found.");
  if (parsed.data === req.user?.id) throw new AppError(400, "SELF_ACTION", "You cannot take this action on your own profile.");
  return parsed.data;
}

export async function blockProfileUser(req: Request, res: Response): Promise<void> {
  const viewer = getSessionUser(req);
  const blockedId = targetId(req);
  const exists = await prisma.user.findUnique({ where: { id: blockedId }, select: { id: true } });
  if (!exists) throw new AppError(404, "PROFILE_NOT_FOUND", "Profile not found.");
  await prisma.$transaction(async (tx) => {
    await tx.userBlock.upsert({
      where: { blockerId_blockedId: { blockerId: viewer.id, blockedId } },
      create: { blockerId: viewer.id, blockedId },
      update: {},
    });
    await tx.connection.deleteMany({
      where: {
        OR: [
          { userLowId: viewer.id, userHighId: blockedId },
          { userLowId: blockedId, userHighId: viewer.id },
        ],
      },
    });
  });
  markNotCacheable(res);
  res.status(200).json({ data: { blocked: true } });
}

export async function unblockProfileUser(req: Request, res: Response): Promise<void> {
  const viewer = getSessionUser(req);
  const blockedId = targetId(req);
  await prisma.userBlock.deleteMany({ where: { blockerId: viewer.id, blockedId } });
  markNotCacheable(res);
  res.status(200).json({ data: { blocked: false } });
}

export async function reportProfileUser(req: Request, res: Response): Promise<void> {
  const viewer = getSessionUser(req);
  const reportedUserId = targetId(req);
  const input = reportSchema.parse(req.body);
  const exists = await prisma.user.findUnique({ where: { id: reportedUserId }, select: { id: true } });
  if (!exists) throw new AppError(404, "PROFILE_NOT_FOUND", "Profile not found.");
  await prisma.$transaction(async (tx) => {
    const report = await tx.userReport.create({ data: { reporterId: viewer.id, reportedUserId, ...input }, select: { id: true } });
    await notifyAdministrators(tx, { actorId: viewer.id, type: "moderation_report", message: "A member was reported and needs review.", resourceId: report.id });
  });
  markNotCacheable(res);
  res.status(201).json({ data: { reported: true } });
}
