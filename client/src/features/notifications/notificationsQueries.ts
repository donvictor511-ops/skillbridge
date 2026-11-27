import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getNotifications,
  getUnreadNotificationCount,
  clearNotifications,
  deleteNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getNotificationSettings,
  updateNotificationPreferences,
  registerNotificationDevice,
  deleteNotificationDevice,
  getNotificationInbox,
} from "./notificationsService";
import type { NotificationPreferences } from "./notifications.types";

export const notificationKeys = {
  all: ["notifications"] as const,
  list: () => [...notificationKeys.all, "list"] as const,
  unreadCount: () => [...notificationKeys.all, "unread-count"] as const,
  settings: () => [...notificationKeys.all, "settings"] as const,
  inbox: (filter: "all" | "unread") => [...notificationKeys.all, "inbox", filter] as const,
};

export function useNotifications(
  enabled = true,
  refetchInterval?: number | false,
) {
  return useQuery({
    queryKey: notificationKeys.list(),
    queryFn: getNotifications,
    enabled,
    retry: false,
    staleTime: 10_000,
    refetchInterval,
    refetchIntervalInBackground: true,
  });
}

export function useNotificationInbox(filter: "all" | "unread") {
  return useInfiniteQuery({
    queryKey: notificationKeys.inbox(filter),
    queryFn: ({ pageParam }) => getNotificationInbox(pageParam, filter),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    retry: false,
  });
}

export function useNotificationSettings() {
  return useQuery({ queryKey: notificationKeys.settings(), queryFn: getNotificationSettings, retry: false });
}

function useRefreshNotificationSettings() {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: notificationKeys.settings() }),
      queryClient.invalidateQueries({ queryKey: notificationKeys.list() }),
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() }),
      queryClient.invalidateQueries({ queryKey: [...notificationKeys.all, "inbox"] }),
    ]);
  };
}

export function useUpdateNotificationPreferences() {
  const refresh = useRefreshNotificationSettings();
  return useMutation({ mutationFn: (input: Partial<NotificationPreferences>) => updateNotificationPreferences(input), onSuccess: refresh });
}

export function useRegisterNotificationDevice() {
  const refresh = useRefreshNotificationSettings();
  return useMutation({ mutationFn: registerNotificationDevice, onSuccess: refresh });
}

export function useDeleteNotificationDevice() {
  const refresh = useRefreshNotificationSettings();
  return useMutation({ mutationFn: deleteNotificationDevice, onSuccess: refresh });
}

export function useUnreadNotificationCount(
  enabled = true,
  refetchInterval: number | false = 30_000,
) {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: getUnreadNotificationCount,
    enabled,
    retry: false,
    staleTime: 10_000,
    refetchInterval,
    refetchIntervalInBackground: true,
  });
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: notificationKeys.list(),
        }),
        queryClient.invalidateQueries({
          queryKey: notificationKeys.unreadCount(),
        }),
        queryClient.invalidateQueries({
          queryKey: [...notificationKeys.all, "inbox"],
        }),
      ]);
    },
  });
}

function useRefreshNotifications() {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: notificationKeys.list() }),
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() }),
      queryClient.invalidateQueries({ queryKey: [...notificationKeys.all, "inbox"] }),
    ]);
  };
}

export function useMarkAllNotificationsAsRead() {
  const refresh = useRefreshNotifications();
  return useMutation({ mutationFn: markAllNotificationsAsRead, onSuccess: refresh });
}

export function useDeleteNotification() {
  const refresh = useRefreshNotifications();
  return useMutation({ mutationFn: deleteNotification, onSuccess: refresh });
}

export function useClearNotifications() {
  const refresh = useRefreshNotifications();
  return useMutation({ mutationFn: clearNotifications, onSuccess: refresh });
}
