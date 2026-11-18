import type { Request, Response } from "express";
import { AppError } from "../../utils/appError";
import { notificationIdSchema } from "./notifications.schema";
import {
  getUnreadNotificationCount,
  listNotifications,
  markNotificationAsRead,
} from "./notifications.service";

function getAuthenticatedUser(req: Request): {
  id: string;
  onboardedAt: Date | null;
} {
  if (!req.user) {
    throw new AppError(
      401,
      "UNAUTHENTICATED",
      "Please log in to manage notifications.",
    );
  }

  if (!req.user.onboardedAt) {
    throw new AppError(
      403,
      "ONBOARDING_REQUIRED",
      "Complete onboarding before accessing notifications.",
    );
  }

  return req.user;
}

export async function getNotifications(
  req: Request,
  res: Response,
): Promise<void> {
  const user = getAuthenticatedUser(req);

  const result = await listNotifications(user.id);

  res.status(200).json({
    data: result,
  });
}

export async function getUnreadCount(
  req: Request,
  res: Response,
): Promise<void> {
  const user = getAuthenticatedUser(req);

  const result = await getUnreadNotificationCount(user.id);

  res.status(200).json({
    data: {
      count: result,
    },
  });
}

export async function readNotification(
  req: Request,
  res: Response,
): Promise<void> {
  const user = getAuthenticatedUser(req);
  const { notificationId } = notificationIdSchema.parse(req.params);

  const result = await markNotificationAsRead(user.id, notificationId);

  res.status(200).json({
    data: result,
  });
}
