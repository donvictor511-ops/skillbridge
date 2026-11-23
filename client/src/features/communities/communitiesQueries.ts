import { useQuery } from "@tanstack/react-query";
import { getCommunities, getCommunity } from "./communitiesService";

export const communityKeys = {
  all: ["communities"] as const,
  list: (search: string, mine: boolean) => ["communities", "list", search, mine] as const,
  detail: (id: string) => ["communities", "detail", id] as const,
};

export function useCommunities(search: string, mine: boolean) {
  return useQuery({ queryKey: communityKeys.list(search, mine), queryFn: () => getCommunities(search, mine), retry: false, staleTime: 15_000 });
}

export function useCommunity(id: string) {
  return useQuery({ queryKey: communityKeys.detail(id), queryFn: () => getCommunity(id), enabled: Boolean(id), retry: false, staleTime: 10_000 });
}
