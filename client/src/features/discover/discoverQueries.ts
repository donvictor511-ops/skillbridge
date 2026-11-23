import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import type { DiscoverFilters } from "../../types/discover";
import { discoverProfiles, getRecommendedProfiles } from "../../services/discoverService";

export const discoverKeys = {
  all: ["discover"] as const,
  list: (filters: DiscoverFilters) => [...discoverKeys.all, filters] as const,
  recommendations: () => [...discoverKeys.all, "recommendations"] as const,
};

export function useDiscoverProfiles(filters: DiscoverFilters = {}) {
  const queryFilters = { ...filters };
  delete queryFilters.page;
  return useInfiniteQuery({
    queryKey: discoverKeys.list(queryFilters),
    queryFn: ({ pageParam }) => discoverProfiles({ ...queryFilters, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.pagination.page < lastPage.pagination.totalPages ? lastPage.pagination.page + 1 : undefined,
    retry: false,
    staleTime: 30_000,
  });
}

export function useRecommendedProfiles(enabled = true) {
  return useQuery({
    queryKey: discoverKeys.recommendations(),
    queryFn: getRecommendedProfiles,
    enabled,
    retry: false,
    staleTime: 60_000,
  });
}
