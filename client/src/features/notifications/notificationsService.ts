import type { ApiSuccessResponse } from "../../types/api";
import { apiClient } from "../../services/apiClient";

import type {
  Notification,
  MarkNotificationReadResponse,
  NotificationBatchActionResponse,
  NotificationSettings,
  NotificationPreferences,
  NotificationDevice,
  FirebaseWebConfig,
  NotificationInboxResponse,
} from "./notifications.types";

export async function getNotifications(): Promise<Notification[]> {
  const response =
    await apiClient.get<ApiSuccessResponse<Notification[]>>("/notifications");

  return response.data.data;
}

export async function getNotificationInbox(cursor?: string, filter: "all" | "unread" = "all"): Promise<NotificationInboxResponse> {
  const response = await apiClient.get<NotificationInboxResponse>("/notifications/inbox", { params: { cursor, limit: 20, filter } });
  return response.data;
}

export async function markAllNotificationsAsRead(): Promise<NotificationBatchActionResponse> {
  const response = await apiClient.patch<
    ApiSuccessResponse<NotificationBatchActionResponse>
  >("/notifications/read-all");
  return response.data.data;
}

export async function deleteNotification(notificationId: string): Promise<void> {
  await apiClient.delete(`/notifications/${notificationId}`);
}

export async function clearNotifications(): Promise<NotificationBatchActionResponse> {
  const response = await apiClient.delete<
    ApiSuccessResponse<NotificationBatchActionResponse>
  >("/notifications");
  return response.data.data;
}

export async function getUnreadNotificationCount(): Promise<number> {
  const response = await apiClient.get<ApiSuccessResponse<{ count: number }>>(
    "/notifications/unread-count",
  );

  return response.data.data.count;
}

export async function markNotificationAsRead(
  notificationId: string,
): Promise<MarkNotificationReadResponse> {
  const response = await apiClient.patch<
    ApiSuccessResponse<MarkNotificationReadResponse>
  >(`/notifications/${notificationId}/read`);

  return response.data.data;
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  const response = await apiClient.get<ApiSuccessResponse<NotificationSettings>>("/notifications/settings");
  return response.data.data;
}

export async function updateNotificationPreferences(input: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
  const response = await apiClient.patch<ApiSuccessResponse<NotificationPreferences>>("/notifications/preferences", input);
  return response.data.data;
}

export async function getFirebaseWebConfig(): Promise<FirebaseWebConfig | null> {
  const response = await apiClient.get<ApiSuccessResponse<{ configured: boolean; config: FirebaseWebConfig | null }>>("/notifications/firebase-config");
  return response.data.data.config;
}

export async function registerNotificationDevice(input: { token: string; label: string }): Promise<NotificationDevice> {
  const response = await apiClient.post<ApiSuccessResponse<NotificationDevice>>("/notifications/devices", input);
  return response.data.data;
}

export async function deleteNotificationDevice(deviceId: string): Promise<void> {
  await apiClient.delete(`/notifications/devices/${encodeURIComponent(deviceId)}`);
}
