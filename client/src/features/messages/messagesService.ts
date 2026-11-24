import { apiClient } from "../../services/apiClient";
import type { ConversationCall, ConversationSummary, MessageItem, Page } from "./messages.types";
export async function listConversations(archived = false, cursor?: string) {
  const { data } = await apiClient.get<Page<ConversationSummary>>("/messages/conversations", { params: { archived, cursor } }); return data;
}
export async function getConversation(id: string) { const { data } = await apiClient.get<{data: ConversationSummary}>(`/messages/conversations/${id}`); return data.data; }
export async function getConversationCalls(id: string): Promise<ConversationCall[]> { const { data } = await apiClient.get<{data: ConversationCall[]}>(`/messages/conversations/${id}/calls`); return data.data; }
export async function createConversation(userId: string) { const { data } = await apiClient.post<{data: ConversationSummary}>("/messages/conversations", { userId }); return data.data; }
export async function getMessages(id: string, cursor?: string) { const { data } = await apiClient.get<Page<MessageItem>>(`/messages/conversations/${id}/messages`, { params: { cursor } }); return data; }
export async function sendMessage(id: string, input: { content: string; mediaUrl?: string; mediaType?: "image" | "video" | "audio"; replyToMessageId?: string }) { const { data } = await apiClient.post<{data: MessageItem}>(`/messages/conversations/${id}/messages`, input); return data.data; }
export async function reactToMessage(conversationId: string, messageId: string, emoji: string): Promise<MessageItem["reactions"]> { const { data } = await apiClient.post<{ data: MessageItem["reactions"] }>(`/messages/conversations/${conversationId}/messages/${messageId}/reactions`, { emoji }); return data.data; }
export async function uploadVoiceMessage(file: File): Promise<{ mediaUrl: string; mediaType: "audio" }> { const form = new FormData(); form.append("file", file); const { data } = await apiClient.post<{ data: { mediaUrl: string; mediaType: "audio" } }>("/messages/audio", form, { headers: { "Content-Type": "multipart/form-data" } }); return data.data; }
export async function updateMessage(conversationId: string, messageId: string, content: string) { const { data } = await apiClient.patch<{data: MessageItem}>(`/messages/conversations/${conversationId}/messages/${messageId}`, { content }); return data.data; }
export async function markRead(id: string) { await apiClient.patch(`/messages/conversations/${id}/read`); }
export async function archive(id: string) { await apiClient.delete(`/messages/conversations/${id}`); }
export async function restore(id: string) { await apiClient.patch(`/messages/conversations/${id}/restore`); }
export async function deleteMessage(conversationId: string, messageId: string, scope:"me"|"everyone") { await apiClient.delete(`/messages/conversations/${conversationId}/messages/${messageId}`, {data:{scope}}); }
export async function unreadMessages() { const { data } = await apiClient.get<{data:{count:number}}>("/messages/unread-count"); return data.data.count; }
