import { apiClient } from "../../services/apiClient";
import type { ApiSuccessResponse } from "../../types/api";

export interface GlobalSearchItem {
  id: string;
  type: "person" | "post" | "community" | "job" | "project";
  title: string;
  description: string;
  imageUrl: string | null;
  meta: string | null;
  href: string;
}
export interface GlobalSearchResults {
  query: string;
  groups: { people: GlobalSearchItem[]; posts: GlobalSearchItem[]; communities: GlobalSearchItem[]; jobs: GlobalSearchItem[]; projects: GlobalSearchItem[] };
  total: number;
}

export async function searchSkillBridge(query: string): Promise<GlobalSearchResults> {
  const response = await apiClient.get<ApiSuccessResponse<GlobalSearchResults>>("/search", { params: { q: query } });
  return response.data.data;
}
