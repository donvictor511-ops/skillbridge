import { apiClient } from "../../services/apiClient";
import type { ApiSuccessResponse } from "../../types/api";

export type CallMode = "audio" | "video";
export interface CallParticipant { userId: string; displayName: string; avatarUrl: string | null; status: "invited" | "joined" | "declined" | "left"; isOnline: boolean; }
export interface CallRoom {
  id: string; kind: "direct" | "community" | "interview"; mode: CallMode; status: "active" | "ended"; createdAt: string; conversationId: string | null;
  participants: CallParticipant[]; community: { id: string; name: string } | null;
  interview: { id: string; scheduledAt: string; durationMinutes: number; mode: CallMode; jobTitle: string } | null;
  iceServers?: RTCIceServer[];
}
export interface CallMessage { id: string; callId: string; senderId: string; senderName: string; avatarUrl: string | null; content: string; mediaUrl: string | null; mediaType: "image" | "video" | "audio" | null; createdAt: string; }
export async function startCall(input: { kind: "direct"; mode: CallMode; conversationId: string } | { kind: "community"; mode: CallMode; communityId: string } | { kind: "interview"; mode: CallMode; interviewId: string }): Promise<CallRoom> { const { data } = await apiClient.post<ApiSuccessResponse<CallRoom>>("/calls", input); return data.data; }
export async function getCall(id: string): Promise<CallRoom> { const { data } = await apiClient.get<ApiSuccessResponse<CallRoom>>(`/calls/${encodeURIComponent(id)}`); return data.data; }
export async function joinCall(id: string): Promise<CallRoom> { const { data } = await apiClient.post<ApiSuccessResponse<CallRoom>>(`/calls/${encodeURIComponent(id)}/join`); return data.data; }
export async function getActiveCommunityCall(id: string): Promise<CallRoom | null> { const { data } = await apiClient.get<ApiSuccessResponse<CallRoom | null>>(`/calls/community/${encodeURIComponent(id)}/active`); return data.data; }
export async function sendSignal(id: string, toUserId: string, signal: Record<string, unknown>) { await apiClient.post(`/calls/${encodeURIComponent(id)}/signal`, { toUserId, signal }); }
export async function leaveCall(id: string, decline = false) { await apiClient.post(`/calls/${encodeURIComponent(id)}/leave`, { decline }); }
export async function listCallMessages(id: string): Promise<CallMessage[]> { const { data } = await apiClient.get<ApiSuccessResponse<CallMessage[]>>(`/calls/${encodeURIComponent(id)}/messages`); return data.data; }
export async function sendCallMessage(id: string, input: { content: string; mediaUrl?: string; mediaType?: "image" | "video" | "audio" }): Promise<CallMessage> { const { data } = await apiClient.post<ApiSuccessResponse<CallMessage>>(`/calls/${encodeURIComponent(id)}/messages`, input); return data.data; }
export async function uploadCallVoice(file: File): Promise<{ mediaUrl: string; mediaType: "audio" }> { const form = new FormData(); form.append("file", file); const { data } = await apiClient.post<ApiSuccessResponse<{ mediaUrl: string; mediaType: "audio" }>>("/calls/audio", form, { headers: { "Content-Type": "multipart/form-data" } }); return data.data; }
