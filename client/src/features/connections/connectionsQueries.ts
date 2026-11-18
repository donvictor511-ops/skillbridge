import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  acceptConnectionRequest,
  getConnections,
  rejectConnectionRequest,
  removeConnection,
  sendConnectionRequest,
} from "./connectionsService";

import type { ConnectionStatus } from "./connections.types";

export const connectionKeys = {
  all: ["connections"] as const,
  list: (status?: ConnectionStatus) =>
    [...connectionKeys.all, "list", status ?? "all"] as const,
};

export function useConnections(
  status?: ConnectionStatus,
  enabled = true,
  refetchInterval?: number | false,
) {
  return useQuery({
    queryKey: connectionKeys.list(status),
    queryFn: () => getConnections(status),
    enabled,
    retry: false,
    staleTime: 15_000,
    refetchInterval,
  });
}

export function useSendConnectionRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sendConnectionRequest,
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: connectionKeys.all,
      }),
  });
}

export function useAcceptConnectionRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: acceptConnectionRequest,
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: connectionKeys.all,
      }),
  });
}

export function useRejectConnectionRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: rejectConnectionRequest,
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: connectionKeys.all,
      }),
  });
}

export function useRemoveConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeConnection,
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: connectionKeys.all,
      }),
  });
}
