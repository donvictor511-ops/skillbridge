import { apiClient } from "../../services/apiClient";
import type { ApiSuccessResponse } from "../../types/api";
import type { CommunityDetail, CommunityInvitation, CommunitySummary } from "./communities.types";

export async function getCommunities(search = "", mine = false): Promise<CommunitySummary[]> {
  const response = await apiClient.get<ApiSuccessResponse<CommunitySummary[]>>("/communities", {
    params: { ...(search ? { search } : {}), ...(mine ? { mine: "true" } : {}) },
  });
  return response.data.data;
}

export async function getCommunity(communityId: string): Promise<CommunityDetail> {
  const response = await apiClient.get<ApiSuccessResponse<CommunityDetail>>(`/communities/${encodeURIComponent(communityId)}`);
  return response.data.data;
}

export async function createCommunity(input: { name: string; description: string; guidelines: string }): Promise<CommunityDetail> {
  const response = await apiClient.post<ApiSuccessResponse<CommunityDetail>>("/communities", input);
  return response.data.data;
}

export async function updateCommunity(input: { id: string; name: string; description: string; guidelines: string }): Promise<CommunityDetail> {
  const { id, ...body } = input;
  const response = await apiClient.patch<ApiSuccessResponse<CommunityDetail>>(`/communities/${encodeURIComponent(id)}`, body);
  return response.data.data;
}

export async function deleteCommunity(id: string): Promise<void> {
  await apiClient.delete(`/communities/${encodeURIComponent(id)}`);
}

export async function joinCommunity(id: string): Promise<CommunityDetail> {
  const response = await apiClient.post<ApiSuccessResponse<CommunityDetail>>(`/communities/${encodeURIComponent(id)}/membership`);
  return response.data.data;
}

export async function leaveCommunity(id: string): Promise<void> {
  await apiClient.delete(`/communities/${encodeURIComponent(id)}/membership`);
}

export async function removeCommunityMember(input: { communityId: string; memberId: string }): Promise<void> {
  await apiClient.delete(`/communities/${encodeURIComponent(input.communityId)}/members/${encodeURIComponent(input.memberId)}`);
}

export async function updateCommunityMemberRole(input: { communityId: string; memberId: string; role: "moderator" | "member" }): Promise<void> {
  const { communityId, memberId, role } = input;
  await apiClient.patch(`/communities/${encodeURIComponent(communityId)}/members/${encodeURIComponent(memberId)}`, { role });
}

export async function createDiscussion(input: { communityId: string; content: string; mediaUrl?: string; mediaType?: "image" | "video" }): Promise<void> {
  await apiClient.post(`/communities/${encodeURIComponent(input.communityId)}/posts`, input);
}

export async function listCommunityInvitations(): Promise<CommunityInvitation[]> { const { data } = await apiClient.get<ApiSuccessResponse<CommunityInvitation[]>>("/communities/invitations"); return data.data; }
export async function inviteCommunityMember(input: { communityId: string; userId: string }) { const { communityId, ...body } = input; const { data } = await apiClient.post<ApiSuccessResponse<{id:string;status:string}>>(`/communities/${encodeURIComponent(communityId)}/invitations`, body); return data.data; }
export async function respondToCommunityInvitation(input: { invitationId: string; status: "accepted" | "declined" }) { const { invitationId, ...body } = input; const { data } = await apiClient.post<ApiSuccessResponse<{id:string;status:string;communityId:string}>>(`/communities/invitations/${encodeURIComponent(invitationId)}/respond`, body); return data.data; }

export async function deleteDiscussion(input: { communityId: string; postId: string }): Promise<void> {
  await apiClient.delete(`/communities/${encodeURIComponent(input.communityId)}/posts/${encodeURIComponent(input.postId)}`);
}

export async function createReply(input: { communityId: string; postId: string; content: string }): Promise<void> {
  await apiClient.post(`/communities/${encodeURIComponent(input.communityId)}/posts/${encodeURIComponent(input.postId)}/comments`, { content: input.content });
}

export async function deleteReply(input: { communityId: string; postId: string; commentId: string }): Promise<void> {
  await apiClient.delete(`/communities/${encodeURIComponent(input.communityId)}/posts/${encodeURIComponent(input.postId)}/comments/${encodeURIComponent(input.commentId)}`);
}

export async function reportCommunity(input: { communityId: string; postId?: string; reason: string; details?: string }): Promise<void> {
  const { communityId, ...body } = input;
  await apiClient.post(`/communities/${encodeURIComponent(communityId)}/reports`, body);
}

export async function resolveCommunityReport(input: { communityId: string; reportId: string; status: "reviewed" | "dismissed"; removePost?: boolean }): Promise<void> {
  const { communityId, reportId, ...body } = input;
  await apiClient.patch(`/communities/${encodeURIComponent(communityId)}/reports/${encodeURIComponent(reportId)}`, body);
}
