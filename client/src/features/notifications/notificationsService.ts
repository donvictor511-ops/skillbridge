import type { ApiSuccessResponse } from "../../types/api";
import { apiClient } from "../../services/apiClient";

import type {
  Notification,
  MarkNotificationReadResponse,
} from "./notifications.types";

export async function getNotifications(): Promise<Notification[]> {
  const response =
    await apiClient.get<ApiSuccessResponse<Notification[]>>("/notifications");

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
