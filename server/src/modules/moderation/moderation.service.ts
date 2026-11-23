import type { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../db/prisma";
import { notifyAdministrators } from "../notifications/notifications.service";

export type ModerationContentType = "post" | "comment" | "community_post" | "community_comment";
export type ModerationStatus = "published" | "pending_review";
export interface ModerationAssessment { status: ModerationStatus; category: string; confidence: number; explanation: string }

const allow: ModerationAssessment = { status: "published", category: "none", confidence: 0, explanation: "" };
const normalize = (value: string) => value.trim().replace(/\s+/g, " ").toLocaleLowerCase();

// A local, deterministic first layer: hold a third identical post in 24 hours.
// This catches obvious copy-paste spam without judging sensitive topics or opinions.
export async function assessContent(authorId: string, content: string, type: ModerationContentType): Promise<ModerationAssessment> {
  const normalized = normalize(content);
  if (normalized.length < 20) return allow;
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const where = { authorId, createdAt: { gte: since }, moderationStatus: "published" as const };
  let recent: Array<{ content: string }> = [];
  if (type === "post") recent = await prisma.post.findMany({ where: { ...where, repostOfId: null }, select: { content: true }, orderBy: { createdAt: "desc" }, take: 50 });
  else if (type === "comment") recent = await prisma.postComment.findMany({ where, select: { content: true }, orderBy: { createdAt: "desc" }, take: 50 });
  else if (type === "community_post") recent = await prisma.communityPost.findMany({ where, select: { content: true }, orderBy: { createdAt: "desc" }, take: 50 });
  else recent = await prisma.communityComment.findMany({ where, select: { content: true }, orderBy: { createdAt: "desc" }, take: 50 });

  const duplicateCount = recent.reduce((count, item) => count + Number(normalize(item.content) === normalized), 0);
  if (duplicateCount < 2) return allow;
  return { status: "pending_review", category: "repeated_spam", confidence: 0.96, explanation: "The same text has already been published repeatedly by this account in the last 24 hours." };
}

export async function saveModerationCase(
  tx: Prisma.TransactionClient,
  input: { contentType: ModerationContentType; contentId: string; authorId: string; content: string; communityName?: string },
  assessment: ModerationAssessment,
): Promise<void> {
  if (assessment.status !== "pending_review") return;
  const moderationCase = await tx.moderationCase.create({
    data: {
      contentType: input.contentType,
      contentId: input.contentId,
      authorId: input.authorId,
      contentSnapshot: input.content.slice(0, 3000),
      category: assessment.category,
      explanation: assessment.explanation,
      confidence: assessment.confidence,
      communityName: input.communityName,
    },
    select: { id: true },
  });
  await tx.notification.create({
    data: {
      recipientId: input.authorId,
      actorId: input.authorId,
      type: "content_moderation_update",
      message: "Your content is temporarily hidden while it is checked for repeated posting. An administrator will review it.",
      resourceId: moderationCase.id,
    },
  });
  await notifyAdministrators(tx, {
    actorId: input.authorId,
    type: "content_moderation_case",
    message: `A ${input.contentType.replaceAll("_", " ")} was held for repeated posting and needs review.`,
    resourceId: moderationCase.id,
  });
}
