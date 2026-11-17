import { useQuery } from "@tanstack/react-query";
import type { DiscoverFilters } from "../../types/discover";
import { discoverProfiles } from "../../services/discoverService";

export const discoverKeys = {
  all: ["discover"] as const,
  list: (filters: DiscoverFilters) => [...discoverKeys.all, filters] as const,
};

export function useDiscoverProfiles(filters: DiscoverFilters = {}) {
  return useQuery({
    queryKey: discoverKeys.list(filters),
    queryFn: () => discoverProfiles(filters),
    retry: false,
    staleTime: 30_000,
  });
}
