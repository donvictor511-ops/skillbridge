import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../db/prisma";
import { AppError } from "../../utils/appError";

const personSelect = { id: true, email: true, role: true, createdAt: true, suspendedAt: true, suspensionReason: true, restrictedUntil: true, restrictionReason: true, profile: { select: { displayName: true, headline: true, avatarUrl: true } } } satisfies Prisma.UserSelect;
const reporterSelect = { id: true, email: true, profile: { select: { displayName: true, avatarUrl: true } } } satisfies Prisma.UserSelect;
const pageSize = 30;
type ReportStatus = "pending" | "reviewed" | "dismissed" | "actioned";

export async function getOverview() {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [totalUsers, activeUsers, suspendedUsers, restrictedUsers, totalPosts, totalComments, totalCommunities, totalJobs, totalProjects, applications, messages, postReports, userReports, communityReports, pendingAppeals, pendingModerationCases, recentUsers, recentPosts] = await Promise.all([
    prisma.user.count(), prisma.user.count({ where: { suspendedAt: null } }), prisma.user.count({ where: { suspendedAt: { not: null } } }), prisma.user.count({ where: { restrictedUntil: { gt: new Date() } } }),
    prisma.post.count(), prisma.postComment.count(), prisma.community.count(), prisma.jobListing.count(), prisma.projectListing.count(), prisma.jobApplication.count(), prisma.message.count(),
    prisma.postReport.count({ where: { status: "pending" } }), prisma.userReport.count({ where: { status: "pending" } }), prisma.communityReport.count({ where: { status: "pending" } }), prisma.accountAppeal.count({ where: { status: "pending" } }), prisma.moderationCase.count({ where: { status: "pending" } }),
    prisma.user.count({ where: { createdAt: { gte: since } } }), prisma.post.count({ where: { createdAt: { gte: since } } }),
  ]);
  return { totalUsers, activeUsers, suspendedUsers, restrictedUsers, totalPosts, totalComments, totalCommunities, totalJobs, totalProjects, totalApplications: applications, totalMessages: messages, pendingReports: postReports + userReports + communityReports, pendingAppeals, pendingModerationCases, newUsersLast30Days: recentUsers, postsLast30Days: recentPosts };
}

export async function listModerationCases(page: number) {
  const where = { status: "pending" as const };
  const [items, total] = await Promise.all([
    prisma.moderationCase.findMany({ where, orderBy: { createdAt: "asc" }, skip: (page - 1) * pageSize, take: pageSize, include: { author: { select: personSelect } } }),
    prisma.moderationCase.count({ where }),
  ]);
  return { items: items.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() })), page, pageSize, total };
}

export async function resolveModerationCase(actorId: string, caseId: string, input: { action: "approve" | "remove"; note: string }) {
  await prisma.$transaction(async (tx) => {
    const review = await tx.moderationCase.findUnique({ where: { id: caseId }, select: { id: true, contentType: true, contentId: true, authorId: true, status: true, category: true } });
    if (!review) throw new AppError(404, "MODERATION_CASE_NOT_FOUND", "Review item not found.");
    if (review.status !== "pending") throw new AppError(409, "MODERATION_CASE_RESOLVED", "This item has already been reviewed.");
    const approved = input.action === "approve";
    let exists = false;
    if (review.contentType === "post") {
      if (approved) exists = (await tx.post.updateMany({ where: { id: review.contentId, moderationStatus: "pending_review" }, data: { moderationStatus: "published" } })).count > 0;
      else exists = (await tx.post.deleteMany({ where: { id: review.contentId } })).count > 0;
    } else if (review.contentType === "comment") {
      if (approved) exists = (await tx.postComment.updateMany({ where: { id: review.contentId, moderationStatus: "pending_review" }, data: { moderationStatus: "published" } })).count > 0;
      else exists = (await tx.postComment.deleteMany({ where: { id: review.contentId } })).count > 0;
    } else if (review.contentType === "community_post") {
      if (approved) exists = (await tx.communityPost.updateMany({ where: { id: review.contentId, moderationStatus: "pending_review" }, data: { moderationStatus: "published" } })).count > 0;
      else exists = (await tx.communityPost.deleteMany({ where: { id: review.contentId } })).count > 0;
    } else {
      if (approved) exists = (await tx.communityComment.updateMany({ where: { id: review.contentId, moderationStatus: "pending_review" }, data: { moderationStatus: "published" } })).count > 0;
      else exists = (await tx.communityComment.deleteMany({ where: { id: review.contentId } })).count > 0;
    }
    const outcome = exists ? (approved ? "approved" : "removed") : "removed";
    await tx.moderationCase.update({ where: { id: caseId }, data: { status: outcome, decisionNote: input.note, resolvedAt: new Date(), resolvedById: actorId } });
    await tx.adminAction.create({ data: { actorId, targetUserId: review.authorId, targetType: "moderated_content", targetId: review.contentId, action: exists ? input.action : "remove_missing", reason: input.note } });
    if (review.authorId) await tx.notification.create({ data: { recipientId: review.authorId, actorId, type: "content_moderation_update", message: exists && approved ? "Your post was approved after review." : `Your post was removed after review. ${input.note}`.slice(0, 500), resourceId: caseId } });
  });
}

export async function listUsers(page: number, search: string) {
  const query = search.trim();
  const where: Prisma.UserWhereInput = query ? { OR: [{ email: { contains: query, mode: "insensitive" } }, { profile: { is: { displayName: { contains: query, mode: "insensitive" } } } }] } : {};
  const [items, total] = await Promise.all([
    prisma.user.findMany({ where, select: { ...personSelect, _count: { select: { posts: true, postComments: true, reportsMade: true } } }, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.user.count({ where }),
  ]);
  return { items: items.map((user) => ({ ...user, createdAt: user.createdAt.toISOString(), suspendedAt: user.suspendedAt?.toISOString() ?? null, restrictedUntil: user.restrictedUntil?.toISOString() ?? null })), page, pageSize, total };
}

export async function updateUserStatus(actorId: string, targetId: string, input: { action: "suspend" | "restrict" | "restore"; reason: string; durationDays: number }) {
  if (actorId === targetId) throw new AppError(400, "CANNOT_MODERATE_SELF", "You cannot suspend or restrict your own administrator account.");
  const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true, role: true } });
  if (!target) throw new AppError(404, "USER_NOT_FOUND", "User not found.");
  if (target.role === "admin") throw new AppError(409, "ADMIN_PROTECTED", "Administrator accounts cannot be suspended from this dashboard.");
  const until = new Date(Date.now() + input.durationDays * 24 * 60 * 60 * 1000);
  const patch = input.action === "suspend" ? { suspendedAt: new Date(), suspensionReason: input.reason, restrictedUntil: null, restrictionReason: null }
    : input.action === "restrict" ? { restrictedUntil: until, restrictionReason: input.reason }
      : { suspendedAt: null, suspensionReason: null, restrictedUntil: null, restrictionReason: null };
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: targetId }, data: patch });
    if (input.action === "suspend") await tx.session.deleteMany({ where: { userId: targetId } });
    await tx.adminAction.create({ data: { actorId, targetUserId: targetId, targetType: "user", targetId, action: input.action, reason: input.reason } });
  });
  return { action: input.action, until: input.action === "restrict" ? until.toISOString() : null };
}

export async function listReports(page: number, status: ReportStatus | "all") {
  const statusWhere = status === "all" ? {} : { status };
  // Fetch enough rows from each report table to produce this page after the
  // combined, globally sorted result is sliced. A fixed per-type cap made
  // reports beyond page 10 count toward the total but impossible to reach.
  const candidatesNeeded = page * pageSize;
  const [posts, users, communities, postTotal, userTotal, communityTotal] = await Promise.all([
    prisma.postReport.findMany({ where: statusWhere, include: { reporter: { select: reporterSelect }, reportedUser: { select: personSelect }, post: { select: { id: true, content: true } }, comment: { select: { id: true, content: true, postId: true } } }, orderBy: { createdAt: "desc" }, take: candidatesNeeded }),
    prisma.userReport.findMany({ where: statusWhere, include: { reporter: { select: reporterSelect }, reportedUser: { select: personSelect } }, orderBy: { createdAt: "desc" }, take: candidatesNeeded }),
    prisma.communityReport.findMany({ where: statusWhere, include: { reporter: { select: reporterSelect }, community: { select: { id: true, name: true, guidelines: true } }, post: { select: { id: true, content: true, author: { select: reporterSelect } } }, comment: { select: { id: true, content: true, postId: true, author: { select: reporterSelect } } } }, orderBy: { createdAt: "desc" }, take: candidatesNeeded }),
    prisma.postReport.count({ where: statusWhere }), prisma.userReport.count({ where: statusWhere }), prisma.communityReport.count({ where: statusWhere }),
  ]);
  const normalized = [
    ...posts.map((r) => ({ id: r.id, type: "post" as const, targetId: r.post?.id ?? r.comment?.id ?? null, targetKind: r.commentId ? "comment" : "post", content: r.comment?.content ?? r.post?.content ?? r.contentSnapshot, status: r.status, reason: r.reason, details: r.details, createdAt: r.createdAt.toISOString(), reporter: r.reporter, targetUser: r.reportedUser, targetAuthor: r.reportedUser })),
    ...users.map((r) => ({ id: r.id, type: "user" as const, targetId: r.reportedUserId, targetKind: "user", content: null, status: r.status, reason: r.reason, details: r.details, createdAt: r.createdAt.toISOString(), reporter: r.reporter, targetUser: r.reportedUser })),
    ...communities.map((r) => ({ id: r.id, type: "community" as const, targetId: r.postId ?? r.commentId ?? r.communityId, targetKind: r.commentId ? "community_comment" : r.postId ? "community_post" : "community", content: r.comment?.content ?? r.post?.content ?? r.contentSnapshot, community: r.community, targetAuthor: r.comment?.author ?? r.post?.author ?? null, status: r.status, reason: r.reason, details: r.details, createdAt: r.createdAt.toISOString(), reporter: r.reporter })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const total = postTotal + userTotal + communityTotal;
  return { items: normalized.slice((page - 1) * pageSize, page * pageSize), page, pageSize, total };
}

export async function resolveReport(actorId: string, type: "user" | "post" | "community", reportId: string, input: { action: "review" | "dismiss" | "remove"; reason: string }) {
  await prisma.$transaction(async (tx) => {
    if (type === "user") {
      const report = await tx.userReport.findUnique({ where: { id: reportId }, select: { id: true, reportedUserId: true } });
      if (!report) throw new AppError(404, "REPORT_NOT_FOUND", "Report not found.");
      const status = input.action === "dismiss" ? "dismissed" : input.action === "remove" ? "actioned" : "reviewed";
      await tx.userReport.update({ where: { id: reportId }, data: { status, resolvedById: actorId, resolvedAt: new Date() } });
      await tx.adminAction.create({ data: { actorId, targetUserId: report.reportedUserId, targetType: "user_report", targetId: reportId, action: input.action, reason: input.reason } });
      return;
    }
    if (type === "post") {
      const report = await tx.postReport.findUnique({ where: { id: reportId }, select: { id: true, postId: true, commentId: true, reportedUserId: true } });
      if (!report) throw new AppError(404, "REPORT_NOT_FOUND", "Report not found.");
      if (input.action === "remove") {
        if (report.commentId) await tx.postComment.deleteMany({ where: { id: report.commentId } });
        if (report.postId) await tx.post.deleteMany({ where: { id: report.postId } });
      }
      const status = input.action === "dismiss" ? "dismissed" : input.action === "remove" ? "actioned" : "reviewed";
      await tx.postReport.update({ where: { id: reportId }, data: { status, resolvedById: actorId, resolvedAt: new Date() } });
      await tx.adminAction.create({ data: { actorId, targetUserId: report.reportedUserId, targetType: report.commentId ? "comment" : "post", targetId: report.commentId ?? report.postId, action: input.action, reason: input.reason } });
      return;
    }
    const report = await tx.communityReport.findUnique({ where: { id: reportId }, select: { id: true, communityId: true, postId: true, commentId: true } });
    if (!report) throw new AppError(404, "REPORT_NOT_FOUND", "Report not found.");
    if (input.action === "remove") {
      if (report.commentId) await tx.communityComment.deleteMany({ where: { id: report.commentId } });
      if (report.postId) await tx.communityPost.deleteMany({ where: { id: report.postId } });
      if (!report.postId && !report.commentId) throw new AppError(400, "CONTENT_NOT_FOUND", "This community report has no removable content target.");
    }
    const status = input.action === "dismiss" ? "dismissed" : input.action === "remove" ? "actioned" : "reviewed";
    await tx.communityReport.update({ where: { id: reportId }, data: { status, resolvedById: actorId, resolvedAt: new Date() } });
    await tx.adminAction.create({ data: { actorId, targetType: report.commentId ? "community_comment" : "community_post", targetId: report.commentId ?? report.postId ?? report.communityId, action: input.action, reason: input.reason } });
  });
}

export async function listHistory(page: number) {
  const [items, total] = await Promise.all([
    prisma.adminAction.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize, include: { actor: { select: reporterSelect }, targetUser: { select: personSelect } } }),
    prisma.adminAction.count(),
  ]);
  return { items: items.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() })), page, pageSize, total };
}

export async function listAccountAppeals(page: number) {
  const [items, total] = await Promise.all([
    prisma.accountAppeal.findMany({
      where: { status: "pending" }, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize,
      include: {
        user: { select: { id: true, email: true, suspendedAt: true, suspensionReason: true, restrictedUntil: true, restrictionReason: true, profile: { select: { displayName: true, avatarUrl: true } } } },
        adminAction: { select: { action: true, reason: true, createdAt: true } },
        resolvedBy: { select: { id: true, email: true, profile: { select: { displayName: true } } } },
      },
    }),
    prisma.accountAppeal.count({ where: { status: "pending" } }),
  ]);
  return { items: items.map((item) => ({ ...item, createdAt: item.createdAt.toISOString(), resolvedAt: item.resolvedAt?.toISOString() ?? null, adminAction: item.adminAction ? { ...item.adminAction, createdAt: item.adminAction.createdAt.toISOString() } : null })), page, pageSize, total };
}

export async function resolveAccountAppeal(actorId: string, appealId: string, input: { action: "accept" | "reject"; note: string }) {
  await prisma.$transaction(async (tx) => {
    const appeal = await tx.accountAppeal.findUnique({ where: { id: appealId }, select: { id: true, userId: true, status: true } });
    if (!appeal) throw new AppError(404, "APPEAL_NOT_FOUND", "Appeal not found.");
    if (appeal.status !== "pending") throw new AppError(409, "APPEAL_ALREADY_RESOLVED", "This appeal has already been resolved.");

    const accepted = input.action === "accept";
    await tx.accountAppeal.update({ where: { id: appealId }, data: { status: accepted ? "accepted" : "rejected", resolutionNote: input.note, resolvedAt: new Date(), resolvedById: actorId } });
    if (accepted) {
      await tx.user.update({ where: { id: appeal.userId }, data: { suspendedAt: null, suspensionReason: null, restrictedUntil: null, restrictionReason: null } });
    }
    await tx.adminAction.create({ data: { actorId, targetUserId: appeal.userId, targetType: "account_appeal", targetId: appeal.id, action: accepted ? "appeal_accepted" : "appeal_rejected", reason: input.note } });
    const outcome = accepted ? "Your appeal was accepted. Your account access has been restored." : "Your appeal was not accepted; the account action remains in place.";
    await tx.notification.create({ data: { recipientId: appeal.userId, actorId, type: "account_appeal_update", message: `${outcome} Decision: ${input.note}`.slice(0, 500), resourceId: appeal.id } });
  });
}
