import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth";
import {
  getNotifications,
  getUnreadCount,
  readAllNotifications,
  readNotification,
  removeAllNotifications,
  removeNotification,
} from "./notifications.controller";

export const notificationsRouter = Router();

// Notification data is private and must never be cached.
notificationsRouter.use((_req, res, next) => {
  res.setHeader("Cache-Control", "private, no-store");
  next();
});

// Every Notifications endpoint requires authentication.
notificationsRouter.use(requireAuth);

// List notifications.
notificationsRouter.get("/", getNotifications);

// Get unread notification count.
notificationsRouter.get("/unread-count", getUnreadCount);
notificationsRouter.patch("/read-all", readAllNotifications);
notificationsRouter.delete("/", removeAllNotifications);

// Mark a notification as read.
notificationsRouter.patch("/:notificationId/read", readNotification);
notificationsRouter.delete("/:notificationId", removeNotification);
