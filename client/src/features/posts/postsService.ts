import { apiClient } from "../../services/apiClient";

import type {
  CreateCommentInput,
  CreatePostInput,
  Post,
  PostComment,
  PostsFeedResponse,
  PostReaction,
  SharePostResponse,
  UpdateCommentInput,
  UpdatePostInput,
} from "./posts.types";

export interface UploadedPostMedia {
  mediaUrl: string;
  mediaType: "image" | "video";
  duration: number | null;
}

export async function uploadPostMedia(file: File): Promise<UploadedPostMedia> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiClient.post<{
    data: UploadedPostMedia;
  }>("/posts/media", formData, {
    // The shared API client defaults JSON requests. Explicitly select
    // multipart so Axios keeps FormData intact and the browser adds its
    // boundary instead of serializing the file as JSON.
    headers: { "Content-Type": "multipart/form-data" },
  });

  return response.data.data;
}

export async function getPosts(
  cursor?: string,
  limit = 20,
): Promise<PostsFeedResponse> {
  const response = await apiClient.get<PostsFeedResponse>("/posts", {
    params: { cursor, limit },
  });

  return response.data;
}

export async function getAuthorPosts(userId: string, cursor?: string, limit = 3): Promise<PostsFeedResponse> {
  const response = await apiClient.get<PostsFeedResponse>(`/posts/by-author/${encodeURIComponent(userId)}`, { params: { cursor, limit } });
  return response.data;
}

export async function createPost(input: CreatePostInput): Promise<Post> {
  const response = await apiClient.post<{ data: Post }>("/posts", input);
  return response.data.data;
}

export async function updatePost(
  postId: string,
  input: UpdatePostInput,
): Promise<Post> {
  const response = await apiClient.patch<{ data: Post }>(
    `/posts/${postId}`,
    input,
  );

  return response.data.data;
}

export async function deletePost(postId: string): Promise<void> {
  await apiClient.delete(`/posts/${postId}`);
}

export async function reportPostContent(input: { postId: string; commentId?: string; reason: string; details?: string }): Promise<void> {
  const url = input.commentId ? `/posts/${input.postId}/comments/${input.commentId}/reports` : `/posts/${input.postId}/reports`;
  const details = input.details?.trim();
  await apiClient.post(url, { reason: input.reason, ...(details ? { details } : {}) });
}

export async function likePost(postId: string): Promise<void> {
  await apiClient.post(`/posts/${postId}/likes`);
}

export async function unlikePost(postId: string): Promise<void> {
  await apiClient.delete(`/posts/${postId}/likes`);
}

export async function reactToPost(postId: string, reactionType: PostReaction): Promise<void> {
  await apiClient.patch(`/posts/${postId}/reactions`, { reactionType });
}

export async function repostPost(postId: string): Promise<void> {
  await apiClient.post(`/posts/${postId}/reposts`);
}

export async function undoRepost(postId: string): Promise<void> {
  await apiClient.delete(`/posts/${postId}/reposts`);
}

export async function sharePostWithConnection(
  postId: string,
  recipientId: string,
): Promise<SharePostResponse> {
  const response = await apiClient.post<{ data: SharePostResponse }>(
    `/posts/${postId}/shares`,
    { recipientId },
  );
  return response.data.data;
}

export async function getComments(postId: string): Promise<PostComment[]> {
  const response = await apiClient.get<{ data: PostComment[] }>(
    `/posts/${postId}/comments`,
  );

  return response.data.data;
}

export async function toggleCommentLike(postId: string, commentId: string, liked: boolean): Promise<void> {
  const url = `/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}/likes`;
  if (liked) await apiClient.post(url);
  else await apiClient.delete(url);
}

export async function createComment(
  postId: string,
  input: CreateCommentInput,
): Promise<PostComment> {
  const response = await apiClient.post<{ data: PostComment }>(
    `/posts/${postId}/comments`,
    input,
  );

  return response.data.data;
}

export async function updateComment(
  postId: string,
  commentId: string,
  input: UpdateCommentInput,
): Promise<PostComment> {
  const response = await apiClient.patch<{ data: PostComment }>(
    `/posts/${postId}/comments/${commentId}`,
    input,
  );

  return response.data.data;
}

export async function deleteComment(
  postId: string,
  commentId: string,
): Promise<void> {
  await apiClient.delete(`/posts/${postId}/comments/${commentId}`);
}
