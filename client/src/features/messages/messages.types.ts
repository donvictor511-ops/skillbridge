export interface ConversationSummary {
  id: string; createdAt: string; updatedAt: string; archivedAt: string | null;
  otherUser: { userId: string; displayName: string; headline: string | null; avatarUrl: string | null; isOnline: boolean };
  unreadCount: number;
  lastMessage: { id: string; senderId: string; content: string; isDeleted: boolean; createdAt: string } | null;
}
export interface MessageItem {
  id: string; conversationId: string; senderId: string; content: string; isDeleted: boolean;
  createdAt: string; readByRecipient: boolean; mediaUrl: string | null; mediaType: "image" | "video" | "audio" | null; editedAt: string | null;
  replyTo: { id: string; content: string; senderName: string; mediaType: string | null } | null;
  reactions: Array<{ emoji: string; count: number; reactedByMe: boolean }>;
  sender: { userId: string; displayName: string; avatarUrl: string | null };
}
export interface Page<T> { data: T[]; nextCursor: string | null }
