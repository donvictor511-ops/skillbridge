export interface PostAuthor {
  userId: string;
  displayName: string;
  headline: string | null;
  avatarUrl: string | null;
  isFollowedByViewer?: boolean;
}

export type PostReaction = "like" | "love" | "celebrate" | "support" | "insightful";

export interface Post {
  id: string;
  content: string;
  imageUrl: string | null;
  videoUrl: string | null;
  createdAt: string;
  updatedAt: string;
  author: PostAuthor;
  repostOf: { id: string; author: PostAuthor } | null;
  likesCount: number;
  reactionsCount: number;
  reactionCounts: Record<PostReaction, number>;
  viewerReaction: PostReaction | null;
  commentsCount: number;
  isLikedByViewer: boolean;
  isRepostedByViewer: boolean;
}

export interface PostComment {
  id: string;
  parentCommentId: string | null;
  content: string;
  imageUrl: string | null;
  videoUrl: string | null;
  createdAt: string;
  updatedAt: string;
  author: PostAuthor;
  likesCount: number;
  isLikedByViewer: boolean;
}

export interface PostsFeedResponse {
  data: Post[];
  nextCursor: string | null;
}

export interface SharePostResponse {
  id: string;
  recipientId: string;
  resourceId: string | null;
  createdAt: string;
}

export interface CreatePostInput {
  content: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
}

export interface UpdatePostInput {
  content?: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
}

export interface CreateCommentInput {
  content: string;
  parentCommentId?: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
}

export interface UpdateCommentInput {
  content?: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
}
