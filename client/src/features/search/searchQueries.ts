import { useQuery } from "@tanstack/react-query";
import { searchSkillBridge } from "./searchService";

export const globalSearchKey = (query: string) => ["global-search", query] as const;
export function useGlobalSearch(query: string, enabled = true) {
  return useQuery({ queryKey: globalSearchKey(query), queryFn: () => searchSkillBridge(query), enabled: enabled && query.trim().length >= 2, staleTime: 30_000, retry: false });
}
