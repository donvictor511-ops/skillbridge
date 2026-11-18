import { prisma } from "../../db/prisma";
import { AppError } from "../../utils/appError";

export type NotificationKind = "connection_request" | "connection_accepted";

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
  return prisma.notification.findMany({
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
        },
      },
    },
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
