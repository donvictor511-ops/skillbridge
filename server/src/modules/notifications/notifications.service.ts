import { prisma } from "../../db/prisma";
import type { Prisma } from "../../generated/prisma/client";
import { AppError } from "../../utils/appError";

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
  return prisma.notification.create({
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
}

export async function listNotifications(userId: string) {
  const notifications = await prisma.notification.findMany({
    where: { recipientId: userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      type: true,
      message: true,
      resourceId: true,
      isRead: true,
      createdAt: true,
      actor: {
        select: {
          id: true,
          profile: {
            select: {
              displayName: true,
              avatarUrl: true,
            },
          },
          followers: {
            where: { followerId: userId },
            select: { followerId: true },
          },
        },
      },
    },
  });

  return notifications.map(({ actor, ...notification }) => {
    const { followers, ...actorData } = actor;
    return {
      ...notification,
      actor: {
        ...actorData,
        isFollowedByViewer: followers.length > 0,
      },
    };
  });
}

export async function getUnreadNotificationCount(userId: string) {
  return prisma.notification.count({
    where: {
      recipientId: userId,
      isRead: false,
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
