import { z } from "zod";

export const notificationIdSchema = z.object({
  notificationId: z.string().uuid("Invalid notification ID."),
});

export const notificationListSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type NotificationListQuery = z.infer<typeof notificationListSchema>;
