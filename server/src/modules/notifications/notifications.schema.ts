import { z } from "zod";

export const notificationIdSchema = z.object({
  notificationId: z.string().uuid("Invalid notification ID."),
});

export const notificationListSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  filter: z.enum(["all", "unread"]).default("all"),
});

export const notificationPreferencesSchema = z.object({
  inAppEnabled: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
  postLikes: z.boolean().optional(),
  comments: z.boolean().optional(),
  mentions: z.boolean().optional(),
  messages: z.boolean().optional(),
  connections: z.boolean().optional(),
  groups: z.boolean().optional(),
  marketplace: z.boolean().optional(),
  platformUpdates: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, "Provide at least one preference to update.");

export const notificationDeviceSchema = z.object({
  token: z.string().min(32).max(4096),
  label: z.string().trim().min(1).max(100).default("Browser"),
});

export const notificationDeviceParamsSchema = z.object({ deviceId: z.string().uuid() });

export type NotificationListQuery = z.infer<typeof notificationListSchema>;
