import { prisma } from "../../db/prisma";
import type { Prisma } from "../../generated/prisma/client";
import { AppError } from "../../utils/appError";
import type { NotificationListQuery } from "./notifications.schema";

export type NotificationKind =
  | "follow"
  | "connection_request"
  | "connection_accepted"
  | "post_like"
  | "post_comment"
  | "post_shared"
  | "message"
  | "community_post"
  | "community_invite"
  | "job_application"
  | "job_application_update"
  | "interview_scheduled"
  | "interview_updated"
  | "project_proposal"
  | "project_proposal_update"
  | "moderation_report"
  | "account_appeal"
  | "content_moderation_case"
  | "content_moderation_update"
  | "account_appeal_update";

const notificationTypesByPreference = {
  postLikes: ["post_like"],
  comments: ["post_comment", "post_shared"],
  messages: ["message"],
  connections: ["connection_request", "connection_accepted"],
  groups: ["community_post", "community_invite"],
  marketplace: ["job_application", "job_application_update", "project_proposal", "project_proposal_update", "interview_scheduled", "interview_updated"],
  platformUpdates: ["moderation_report", "account_appeal", "account_appeal_update", "content_moderation_case", "content_moderation_update"],
} as const;

export async function getNotificationPreferences(userId: string) {
  return prisma.notificationPreference.upsert({ where: { userId }, create: { userId }, update: {} });
}

export async function updateNotificationPreferences(
  userId: string,
  input: Partial<Pick<Awaited<ReturnType<typeof getNotificationPreferences>>, "inAppEnabled" | "pushEnabled" | "postLikes" | "comments" | "mentions" | "messages" | "connections" | "groups" | "marketplace" | "platformUpdates">>,
) {
  return prisma.notificationPreference.upsert({
    where: { userId },
    create: { userId, ...input },
    update: input,
  });
}

function visibleNotificationTypes(preferences: Awaited<ReturnType<typeof getNotificationPreferences>>) {
  return Object.entries(notificationTypesByPreference)
    .filter(([key]) => !preferences[key as keyof typeof notificationTypesByPreference])
    .flatMap(([, types]) => [...types]);
}

function notificationSelectFor(userId: string) {
  return {
    id: true,
    type: true,
    message: true,
    resourceId: true,
    isRead: true,
    createdAt: true,
    actor: {
      select: {
        id: true,
        profile: { select: { displayName: true, avatarUrl: true } },
        followers: { where: { followerId: userId }, select: { followerId: true } },
      },
    },
  } satisfies Prisma.NotificationSelect;
}

function addFollowState<T extends { actor: { followers: readonly unknown[] } }>(rows: T[]) {
  return rows.map(({ actor, ...notification }) => {
    const { followers, ...actorData } = actor;
    return { ...notification, actor: { ...actorData, isFollowedByViewer: followers.length > 0 } };
  });
}

export async function notifyAdministrators(
  tx: Prisma.TransactionClient,
  input: { actorId: string; type: "moderation_report" | "account_appeal" | "content_moderation_case"; message: string; resourceId: string },
): Promise<void> {
  const admins = await tx.user.findMany({ where: { role: "admin", id: { not: input.actorId } }, select: { id: true } });
  if (!admins.length) return;
  await tx.notification.createMany({
    data: admins.map(({ id }) => ({ recipientId: id, actorId: input.actorId, type: input.type, message: input.message, resourceId: input.resourceId })),
  });
}

interface CreateNotificationInput {
  recipientId: string;
  actorId: string;
  type: NotificationKind;
  message: string;
  resourceId?: string | null;
}

export async function createNotification(input: CreateNotificationInput) {
  const notification = await prisma.notification.create({
    data: {
      recipientId: input.recipientId,
      actorId: input.actorId,
      type: input.type,
      message: input.message,
      resourceId: input.resourceId ?? null,
    },
    select: {
      id: true,
      recipientId: true,
      actorId: true,
      type: true,
      message: true,
      resourceId: true,
      isRead: true,
      createdAt: true,
    },
  });
  return notification;
}

export async function listNotifications(userId: string) {
  const preferences = await getNotificationPreferences(userId);
  if (!preferences.inAppEnabled) return [];
  const rows = await prisma.notification.findMany({
    where: { recipientId: userId, type: { notIn: visibleNotificationTypes(preferences) } },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: notificationSelectFor(userId),
  });
  return addFollowState(rows);
}

export async function listNotificationPage(userId: string, query: NotificationListQuery) {
  const preferences = await getNotificationPreferences(userId);
  if (!preferences.inAppEnabled) return { data: [], nextCursor: null };
  const excludedTypes = visibleNotificationTypes(preferences);
  const where = {
    recipientId: userId,
    type: { notIn: excludedTypes },
    ...(query.filter === "unread" ? { isRead: false } : {}),
  };
  let cursorDate: Date | undefined;
  if (query.cursor) {
    const cursor = await prisma.notification.findFirst({ where: { ...where, id: query.cursor }, select: { id: true, createdAt: true } });
    if (!cursor) throw new AppError(404, "NOTIFICATION_NOT_FOUND", "Notification cursor not found.");
    cursorDate = cursor.createdAt;
  }
  const rows = await prisma.notification.findMany({
    where: { ...where, ...(cursorDate ? { OR: [{ createdAt: { lt: cursorDate } }, { createdAt: cursorDate, id: { lt: query.cursor! } }] } : {}) },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: query.limit + 1,
    select: notificationSelectFor(userId),
  });
  const hasMore = rows.length > query.limit;
  const data = addFollowState(rows.slice(0, query.limit));
  return { data, nextCursor: hasMore ? data.at(-1)?.id ?? null : null };
}

export async function getUnreadNotificationCount(userId: string) {
  const preferences = await getNotificationPreferences(userId);
  if (!preferences.inAppEnabled) return 0;
  return prisma.notification.count({
    where: {
      recipientId: userId,
      isRead: false,
      type: { notIn: visibleNotificationTypes(preferences) },
    },
  });
}

export async function markNotificationAsRead(
  userId: string,
  notificationId: string,
) {
  const result = await prisma.notification.updateMany({
    where: {
      id: notificationId,
      recipientId: userId,
      isRead: false,
    },
    data: {
      isRead: true,
    },
  });

  if (result.count === 0) {
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        recipientId: userId,
      },
      select: {
        id: true,
        isRead: true,
      },
    });

    if (!notification) {
      throw new AppError(
        404,
        "NOTIFICATION_NOT_FOUND",
        "Notification not found.",
      );
    }

    // The notification exists and is already read.
    return notification;
  }

  return prisma.notification.findFirstOrThrow({
    where: {
      id: notificationId,
      recipientId: userId,
    },
    select: {
      id: true,
      isRead: true,
    },
  });
}

export async function markAllNotificationsAsRead(userId: string) {
  const result = await prisma.notification.updateMany({
    where: { recipientId: userId, isRead: false },
    data: { isRead: true },
  });

  return { updatedCount: result.count };
}

export async function deleteNotification(userId: string, notificationId: string) {
  const result = await prisma.notification.deleteMany({
    where: { id: notificationId, recipientId: userId },
  });

  if (result.count !== 1) {
    throw new AppError(404, "NOTIFICATION_NOT_FOUND", "Notification not found.");
  }
}

export async function clearNotifications(userId: string) {
  const result = await prisma.notification.deleteMany({
    where: { recipientId: userId },
  });

  return { deletedCount: result.count };
}
