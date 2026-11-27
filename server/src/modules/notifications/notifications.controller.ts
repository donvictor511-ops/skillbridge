import type { Request, Response } from "express";
import { AppError } from "../../utils/appError";
import { notificationDeviceParamsSchema, notificationDeviceSchema, notificationIdSchema, notificationListSchema, notificationPreferencesSchema } from "./notifications.schema";
import {
  clearNotifications as clearNotificationsService,
  deleteNotification as deleteNotificationService,
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsAsRead as markAllNotificationsAsReadService,
  markNotificationAsRead,
  getNotificationPreferences,
  updateNotificationPreferences,
  listNotificationPage,
} from "./notifications.service";
import { getFirebaseWebConfig, listNotificationDevices, registerNotificationDevice, removeNotificationDevice } from "./push.service";

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

export async function getNotificationInbox(req: Request, res: Response): Promise<void> {
  const user = getAuthenticatedUser(req);
  res.status(200).json(await listNotificationPage(user.id, notificationListSchema.parse(req.query)));
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

export async function readAllNotifications(req: Request, res: Response): Promise<void> {
  const user = getAuthenticatedUser(req);
  const result = await markAllNotificationsAsReadService(user.id);
  res.status(200).json({ data: result });
}

export async function removeNotification(req: Request, res: Response): Promise<void> {
  const user = getAuthenticatedUser(req);
  const { notificationId } = notificationIdSchema.parse(req.params);
  await deleteNotificationService(user.id, notificationId);
  res.status(204).send();
}

export async function removeAllNotifications(req: Request, res: Response): Promise<void> {
  const user = getAuthenticatedUser(req);
  const result = await clearNotificationsService(user.id);
  res.status(200).json({ data: result });
}

export async function getPushConfiguration(_req: Request, res: Response): Promise<void> {
  const config = await getFirebaseWebConfig();
  res.status(200).json({ data: { configured: Boolean(config), config } });
}

export async function getNotificationSettings(req: Request, res: Response): Promise<void> {
  const user = getAuthenticatedUser(req);
  const [preferences, devices] = await Promise.all([getNotificationPreferences(user.id), listNotificationDevices(user.id)]);
  res.status(200).json({ data: { preferences, devices } });
}

export async function patchNotificationPreferences(req: Request, res: Response): Promise<void> {
  const user = getAuthenticatedUser(req);
  const input = notificationPreferencesSchema.parse(req.body);
  if (input.pushEnabled && !(await getFirebaseWebConfig())) throw new AppError(503, "PUSH_NOT_CONFIGURED", "Browser push notifications are not configured yet.");
  res.status(200).json({ data: await updateNotificationPreferences(user.id, input) });
}

export async function addNotificationDevice(req: Request, res: Response): Promise<void> {
  const user = getAuthenticatedUser(req);
  if (!(await getFirebaseWebConfig())) throw new AppError(503, "PUSH_NOT_CONFIGURED", "Browser push notifications are not configured yet.");
  const input = notificationDeviceSchema.parse(req.body);
  res.status(201).json({ data: await registerNotificationDevice(user.id, input.token, input.label) });
}

export async function deleteNotificationDevice(req: Request, res: Response): Promise<void> {
  const user = getAuthenticatedUser(req);
  const { deviceId } = notificationDeviceParamsSchema.parse(req.params);
  await removeNotificationDevice(user.id, deviceId);
  res.status(204).send();
}
