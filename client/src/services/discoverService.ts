import type { ApiSuccessResponse } from "../types/api";
import type { DiscoverFilters, DiscoverResponse } from "../types/discover";
import { apiClient } from "./apiClient";

export async function discoverProfiles(
  filters: DiscoverFilters = {},
): Promise<DiscoverResponse> {
  const response = await apiClient.get<ApiSuccessResponse<DiscoverResponse>>(
    "/discover",
    {
      params: filters,
    },
  );

  return response.data.data;
}
