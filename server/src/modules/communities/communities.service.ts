import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../db/prisma";
import { AppError } from "../../utils/appError";
import { notifyAdministrators } from "../notifications/notifications.service";
import { assessContent, saveModerationCase } from "../moderation/moderation.service";

const authorSelect = {
  id: true,
  profile: { select: { displayName: true, avatarUrl: true, headline: true } },
} satisfies Prisma.UserSelect;

function missingCommunity(): AppError {
  return new AppError(404, "COMMUNITY_NOT_FOUND", "Community not found.");
}

function forbidden(): AppError {
  return new AppError(403, "COMMUNITY_PERMISSION_DENIED", "You do not have permission to do that.");
}

async function requireCommunity(communityId: string) {
  const community = await prisma.community.findUnique({ where: { id: communityId } });
  if (!community) throw missingCommunity();
  return community;
}

async function requireMember(communityId: string, userId: string) {
  const member = await prisma.communityMember.findUnique({
    where: { communityId_userId: { communityId, userId } },
  });
  if (!member) throw forbidden();
  return member;
}

async function requireModerator(communityId: string, userId: string) {
  const member = await requireMember(communityId, userId);
  if (member.role !== "owner" && member.role !== "moderator") throw forbidden();
  return member;
}

export async function listCommunities(userId: string, search?: string, mine = false) {
  const query = search?.trim();
  const rows = await prisma.community.findMany({
    where: {
      ...(mine ? { members: { some: { userId } } } : {}),
      ...(query ? { OR: [
        { name: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
      ] } : {}),
    },
    orderBy: [{ members: { _count: "desc" } }, { updatedAt: "desc" }],
    take: 60,
    include: {
      owner: { select: authorSelect },
      _count: { select: { members: true, posts: { where: { moderationStatus: "published" } } } },
      members: { where: { userId }, select: { role: true } },
    },
  });
  return rows.map((row) => ({
    id: row.id, name: row.name, description: row.description,
    guidelines: row.guidelines, owner: row.owner,
    memberCount: row._count.members, postCount: row._count.posts,
    myRole: row.members[0]?.role ?? null, createdAt: row.createdAt.toISOString(),
  }));
}

export async function createCommunity(userId: string, input: { name: string; description: string; guidelines?: string }) {
  const community = await prisma.community.create({
    data: {
      ownerId: userId,
      name: input.name,
      description: input.description,
      guidelines: input.guidelines ?? "",
      members: { create: { userId, role: "owner" } },
    },
    select: { id: true },
  });
  return getCommunity(userId, community.id);
}

export async function getCommunity(userId: string, communityId: string) {
  const community = await prisma.community.findUnique({
    where: { id: communityId },
    include: {
      owner: { select: authorSelect },
      _count: { select: { members: true, posts: { where: { moderationStatus: "published" } } } },
      members: {
        orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
        take: 100,
        include: { user: { select: authorSelect } },
      },
    },
  });
  if (!community) throw missingCommunity();
  const membership = community.members.find((member) => member.userId === userId);
  const posts = membership ? await prisma.communityPost.findMany({
    where: { communityId, moderationStatus: "published" }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 50,
    include: {
      author: { select: authorSelect },
      comments: { where: { moderationStatus: "published" }, orderBy: { createdAt: "asc" }, take: 100, include: { author: { select: authorSelect } } },
    },
  }) : [];
  const reports = membership && (membership.role === "owner" || membership.role === "moderator")
    ? await prisma.communityReport.findMany({
      where: { communityId, status: "pending" }, orderBy: { createdAt: "desc" }, take: 50,
      include: { reporter: { select: authorSelect }, post: { select: { id: true, content: true } } },
    }) : [];
  return {
    id: community.id, name: community.name, description: community.description,
    guidelines: community.guidelines, owner: community.owner,
    memberCount: community._count.members, postCount: community._count.posts,
    myRole: membership?.role ?? null, createdAt: community.createdAt.toISOString(),
    members: membership ? community.members.map((member) => ({
      userId: member.userId, role: member.role, joinedAt: member.joinedAt.toISOString(), user: member.user,
    })) : [],
    posts: posts.map((post) => ({ ...post, createdAt: post.createdAt.toISOString(), updatedAt: post.updatedAt.toISOString() })),
    reports: reports.map((report) => ({
      id: report.id, postId: report.postId, reason: report.reason, details: report.details,
      status: report.status, createdAt: report.createdAt.toISOString(),
      reporter: report.reporter, post: report.post,
    })),
  };
}

export async function updateCommunity(userId: string, communityId: string, input: { name?: string; description?: string; guidelines?: string }) {
  await requireModerator(communityId, userId);
  await prisma.community.update({ where: { id: communityId }, data: input });
  return getCommunity(userId, communityId);
}

export async function deleteCommunity(userId: string, communityId: string) {
  const community = await requireCommunity(communityId);
  if (community.ownerId !== userId) throw forbidden();
  await prisma.community.delete({ where: { id: communityId } });
}

export async function joinCommunity(userId: string, communityId: string) {
  await requireCommunity(communityId);
  await prisma.communityMember.upsert({
    where: { communityId_userId: { communityId, userId } },
    create: { communityId, userId }, update: {},
  });
  return getCommunity(userId, communityId);
}

export async function leaveCommunity(userId: string, communityId: string) {
  const member = await requireMember(communityId, userId);
  if (member.role === "owner") throw new AppError(409, "OWNER_CANNOT_LEAVE", "Transfer ownership or delete this community before leaving.");
  await prisma.communityMember.delete({ where: { communityId_userId: { communityId, userId } } });
}

export async function removeCommunityMember(actorId: string, communityId: string, memberId: string) {
  const actor = await requireModerator(communityId, actorId);
  const target = await requireMember(communityId, memberId);
  if (target.role === "owner" || (target.role === "moderator" && actor.role !== "owner")) throw forbidden();
  await prisma.communityMember.delete({ where: { communityId_userId: { communityId, userId: memberId } } });
}

export async function updateCommunityMemberRole(actorId: string, communityId: string, memberId: string, role: "moderator" | "member") {
  const actor = await requireModerator(communityId, actorId);
  if (actor.role !== "owner") throw forbidden();
  const target = await requireMember(communityId, memberId);
  if (target.role === "owner" || memberId === actorId) throw forbidden();
  await prisma.communityMember.update({
    where: { communityId_userId: { communityId, userId: memberId } }, data: { role },
  });
}

export async function createCommunityPost(userId: string, communityId: string, input: { content: string; mediaUrl?: string; mediaType?: "image" | "video" }) {
  const community = await requireCommunity(communityId);
  await requireMember(communityId, userId);
  const content = input.content || (input.mediaType === "video" ? "Shared a video." : "Shared an image.");
  const assessment = await assessContent(userId, content, "community_post");
  const post = await prisma.$transaction(async (tx) => {
    const created = await tx.communityPost.create({
      data: { communityId, authorId: userId, content, mediaUrl: input.mediaUrl, mediaType: input.mediaType, moderationStatus: assessment.status }, include: { author: { select: authorSelect } },
    });
    await saveModerationCase(tx, { contentType: "community_post", contentId: created.id, authorId: userId, content, communityName: community.name }, assessment);
    const recipients = assessment.status === "published" ? await tx.communityMember.findMany({
      where: { communityId, userId: { not: userId } }, select: { userId: true },
    }) : [];
    if (recipients.length) await tx.notification.createMany({
      data: recipients.map(({ userId: recipientId }) => ({
        recipientId, actorId: userId, type: "community_post" as const,
        message: `started a discussion in ${community.name}`, resourceId: communityId,
      })),
    });
    await tx.community.update({ where: { id: communityId }, data: { updatedAt: new Date() } });
    return created;
  });
  return { ...post, createdAt: post.createdAt.toISOString(), updatedAt: post.updatedAt.toISOString() };
}

export async function inviteCommunityMember(inviterId: string, communityId: string, inviteeId: string) {
  const community = await requireCommunity(communityId);
  await requireMember(communityId, inviterId);
  if (inviterId === inviteeId) throw new AppError(400, "INVALID_INVITEE", "You cannot invite yourself.");
  const connection = await prisma.connection.findFirst({ where: { status: "accepted", OR: [{ userLowId: inviterId, userHighId: inviteeId }, { userLowId: inviteeId, userHighId: inviterId }] }, select: { id: true } });
  if (!connection) throw new AppError(403, "CONNECTION_REQUIRED", "You can invite people you are connected with.");
  const [existingMember, invitee] = await Promise.all([
    prisma.communityMember.findUnique({ where: { communityId_userId: { communityId, userId: inviteeId } }, select: { userId: true } }),
    prisma.profile.findUnique({ where: { userId: inviteeId }, select: { allowCommunityInvites: true } }),
  ]);
  if (!invitee || !invitee.allowCommunityInvites) throw new AppError(403, "COMMUNITY_INVITES_DISABLED", "This person does not accept community invitations.");
  if (existingMember) throw new AppError(409, "ALREADY_A_MEMBER", "This person is already in the community.");
  const current = await prisma.communityInvitation.findUnique({ where: { communityId_inviteeId: { communityId, inviteeId } }, select: { id: true, status: true } });
  if (current?.status === "pending" || current?.status === "accepted") throw new AppError(409, "INVITATION_EXISTS", "An invitation already exists for this person.");
  const invitation = await prisma.communityInvitation.upsert({ where: { communityId_inviteeId: { communityId, inviteeId } }, create: { communityId, inviterId, inviteeId }, update: { inviterId, status: "pending" } });
  await prisma.notification.create({ data: { recipientId: inviteeId, actorId: inviterId, type: "community_invite", message: `invited you to join ${community.name}`, resourceId: invitation.id } });
  return { id: invitation.id, status: invitation.status, community: { id: community.id, name: community.name } };
}

export async function listMyInvitations(userId: string) {
  const rows = await prisma.communityInvitation.findMany({ where: { inviteeId: userId, status: "pending" }, orderBy: { createdAt: "desc" }, take: 50, include: { community: { select: { id: true, name: true, description: true } }, inviter: { select: authorSelect } } });
  return rows.map((row) => ({ id: row.id, createdAt: row.createdAt.toISOString(), community: row.community, inviter: row.inviter }));
}

export async function respondToInvitation(userId: string, invitationId: string, status: "accepted" | "declined") {
  const invitation = await prisma.communityInvitation.findFirst({ where: { id: invitationId, inviteeId: userId, status: "pending" }, select: { id: true, communityId: true } });
  if (!invitation) throw new AppError(404, "INVITATION_NOT_FOUND", "This invitation is no longer available.");
  await prisma.$transaction(async (tx) => {
    await tx.communityInvitation.update({ where: { id: invitationId }, data: { status } });
    if (status === "accepted") await tx.communityMember.upsert({ where: { communityId_userId: { communityId: invitation.communityId, userId } }, create: { communityId: invitation.communityId, userId }, update: {} });
  });
  return { id: invitationId, status, communityId: invitation.communityId };
}

export async function createCommunityComment(userId: string, communityId: string, postId: string, content: string) {
  await requireMember(communityId, userId);
  const community = await requireCommunity(communityId);
  const post = await prisma.communityPost.findFirst({
    where: { id: postId, communityId, moderationStatus: "published" }, select: { id: true, authorId: true },
  });
  if (!post) throw new AppError(404, "COMMUNITY_POST_NOT_FOUND", "Discussion not found.");
  const assessment = await assessContent(userId, content, "community_comment");
  const comment = await prisma.$transaction(async (tx) => {
    const created = await tx.communityComment.create({
      data: { postId, authorId: userId, content, moderationStatus: assessment.status },
      include: { author: { select: authorSelect } },
    });
    await saveModerationCase(tx, { contentType: "community_comment", contentId: created.id, authorId: userId, content, communityName: community.name }, assessment);
    if (assessment.status === "published" && post.authorId !== userId) await tx.notification.create({
      data: { recipientId: post.authorId, actorId: userId, type: "community_post", message: "replied to your discussion", resourceId: communityId },
    });
    return created;
  });
  return { ...comment, createdAt: comment.createdAt.toISOString() };
}

export async function deleteCommunityComment(userId: string, communityId: string, postId: string, commentId: string) {
  await requireMember(communityId, userId);
  const comment = await prisma.communityComment.findFirst({
    where: { id: commentId, postId, post: { communityId } }, select: { authorId: true },
  });
  if (!comment) throw new AppError(404, "COMMUNITY_COMMENT_NOT_FOUND", "Reply not found.");
  if (comment.authorId !== userId) await requireModerator(communityId, userId);
  await prisma.communityComment.delete({ where: { id: commentId } });
}

export async function deleteCommunityPost(userId: string, communityId: string, postId: string) {
  await requireCommunity(communityId);
  const post = await prisma.communityPost.findFirst({ where: { id: postId, communityId }, select: { authorId: true } });
  if (!post) throw new AppError(404, "COMMUNITY_POST_NOT_FOUND", "Discussion not found.");
  if (post.authorId !== userId) await requireModerator(communityId, userId);
  await prisma.communityPost.delete({ where: { id: postId } });
}

export async function reportCommunity(userId: string, communityId: string, input: { postId?: string; commentId?: string; reason: string; details?: string | null }) {
  await requireMember(communityId, userId);
  if (input.postId) {
    const post = await prisma.communityPost.findFirst({ where: { id: input.postId, communityId }, select: { authorId: true, content: true } });
    if (!post) throw new AppError(404, "COMMUNITY_POST_NOT_FOUND", "Discussion not found.");
    if (post.authorId === userId) throw new AppError(400, "CANNOT_REPORT_OWN_POST", "You cannot report your own discussion.");
  }
  if (input.commentId) {
    const comment = await prisma.communityComment.findFirst({ where: { id: input.commentId, post: { communityId } }, select: { authorId: true, content: true } });
    if (!comment) throw new AppError(404, "COMMUNITY_COMMENT_NOT_FOUND", "Reply not found.");
    if (comment.authorId === userId) throw new AppError(400, "CANNOT_REPORT_OWN_COMMENT", "You cannot report your own reply.");
  }
  const contentSnapshot = input.postId
    ? (await prisma.communityPost.findUnique({ where: { id: input.postId }, select: { content: true } }))?.content
    : input.commentId ? (await prisma.communityComment.findUnique({ where: { id: input.commentId }, select: { content: true } }))?.content : null;
  return prisma.$transaction(async (tx) => {
    const report = await tx.communityReport.create({
      data: { communityId, postId: input.postId, commentId: input.commentId, reporterId: userId, reason: input.reason, details: input.details, contentSnapshot },
      select: { id: true, status: true },
    });
    await notifyAdministrators(tx, { actorId: userId, type: "moderation_report", message: "A community report needs review.", resourceId: report.id });
    return report;
  });
}

export async function resolveCommunityReport(userId: string, communityId: string, reportId: string, status: "reviewed" | "dismissed", removePost = false) {
  await requireModerator(communityId, userId);
  await prisma.$transaction(async (tx) => {
    const report = await tx.communityReport.findFirst({
      where: { id: reportId, communityId, status: "pending" },
      select: { id: true, postId: true },
    });
    if (!report) throw new AppError(404, "COMMUNITY_REPORT_NOT_FOUND", "Report not found or already reviewed.");
    if (removePost && report.postId) {
      await tx.communityPost.deleteMany({ where: { id: report.postId, communityId } });
    }
    await tx.communityReport.update({
      where: { id: reportId },
      data: { status, resolvedById: userId, resolvedAt: new Date() },
    });
  });
}
