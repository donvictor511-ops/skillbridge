import type { ApiSuccessResponse } from "../../types/api";
import { apiClient } from "../../services/apiClient";

import type {
  Notification,
  MarkNotificationReadResponse,
  NotificationBatchActionResponse,
} from "./notifications.types";

export async function getNotifications(): Promise<Notification[]> {
  const response =
    await apiClient.get<ApiSuccessResponse<Notification[]>>("/notifications");

  return response.data.data;
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
