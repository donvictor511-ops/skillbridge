import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  acceptConnectionRequest,
  getConnections,
  rejectConnectionRequest,
  removeConnection,
  sendConnectionRequest,
} from "./connectionsService";

import type { ConnectionStatus } from "./connections.types";
import { discoverKeys } from "../discover/discoverQueries";
import type { QueryClient } from "@tanstack/react-query";

function refreshNetworkQueries(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: connectionKeys.all }),
    queryClient.invalidateQueries({ queryKey: discoverKeys.all }),
  ]);
}

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
    onSuccess: () => refreshNetworkQueries(queryClient),
  });
}

export function useAcceptConnectionRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: acceptConnectionRequest,
    onSuccess: () => refreshNetworkQueries(queryClient),
  });
}

export function useRejectConnectionRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: rejectConnectionRequest,
    onSuccess: () => refreshNetworkQueries(queryClient),
  });
}

export function useRemoveConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeConnection,
    onSuccess: () => refreshNetworkQueries(queryClient),
  });
}
