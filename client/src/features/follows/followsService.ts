import type { ApiSuccessResponse } from "../../types/api";
import { apiClient } from "../../services/apiClient";

export interface FollowResult {
  followerId: string;
  followedId: string;
  createdAt: string;
}

export async function followUser(userId: string): Promise<FollowResult> {
  const response = await apiClient.post<ApiSuccessResponse<FollowResult>>(`/follows/${encodeURIComponent(userId)}`);
  return response.data.data;
}

export async function unfollowUser(userId: string): Promise<void> {
  await apiClient.delete(`/follows/${encodeURIComponent(userId)}`);
}
