import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth";
import {
  getNotifications,
  getUnreadCount,
  readAllNotifications,
  readNotification,
  removeAllNotifications,
  removeNotification,
  getPushConfiguration,
  getNotificationSettings,
  patchNotificationPreferences,
  addNotificationDevice,
  deleteNotificationDevice,
  getNotificationInbox,
} from "./notifications.controller";

export const notificationsRouter = Router();

// Notification data is private and must never be cached.
notificationsRouter.use((_req, res, next) => {
  res.setHeader("Cache-Control", "private, no-store");
  next();
});

// Firebase web configuration contains public client keys only.
notificationsRouter.get("/firebase-config", getPushConfiguration);

// Private notification endpoints require authentication.
notificationsRouter.use(requireAuth);

notificationsRouter.get("/settings", getNotificationSettings);
notificationsRouter.get("/inbox", getNotificationInbox);
notificationsRouter.patch("/preferences", patchNotificationPreferences);
notificationsRouter.post("/devices", addNotificationDevice);
notificationsRouter.delete("/devices/:deviceId", deleteNotificationDevice);

// List notifications.
notificationsRouter.get("/", getNotifications);

// Get unread notification count.
notificationsRouter.get("/unread-count", getUnreadCount);
notificationsRouter.patch("/read-all", readAllNotifications);
notificationsRouter.delete("/", removeAllNotifications);

// Mark a notification as read.
notificationsRouter.patch("/:notificationId/read", readNotification);
notificationsRouter.delete("/:notificationId", removeNotification);
