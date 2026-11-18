import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
} from "./notificationsService";

export const notificationKeys = {
  all: ["notifications"] as const,
  list: () => [...notificationKeys.all, "list"] as const,
  unreadCount: () => [...notificationKeys.all, "unread-count"] as const,
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
  });
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
      ]);
    },
  });
}
