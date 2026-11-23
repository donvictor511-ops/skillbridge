import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";

import {
  createComment,
  createPost,
  deleteComment,
  deletePost,
  getComments,
  getPosts,
  likePost,
  unlikePost,
  sharePostWithConnection,
  repostPost,
  undoRepost,
  updateComment,
  updatePost,
  reactToPost,
} from "./postsService";

import type {
  CreateCommentInput,
  CreatePostInput,
  UpdateCommentInput,
  UpdatePostInput,
  PostsFeedResponse,
  PostReaction,
} from "./posts.types";

export const postKeys = {
  all: ["posts"] as const,
  feed: () => [...postKeys.all, "feed"] as const,
  comments: (postId: string) => [...postKeys.all, "comments", postId] as const,
};

export function usePosts() {
  return useInfiniteQuery({
    queryKey: postKeys.feed(),
    queryFn: ({ pageParam }) => getPosts(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    retry: false,
    staleTime: 15_000,
  });
}

export function useComments(postId: string, enabled = true) {
  return useQuery({
    queryKey: postKeys.comments(postId),
    queryFn: () => getComments(postId),
    enabled,
    retry: false,
    staleTime: 15_000,
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreatePostInput) => createPost(input),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: postKeys.feed(),
      }),
  });
}

export function useUpdatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      postId,
      input,
    }: {
      postId: string;
      input: UpdatePostInput;
    }) => updatePost(postId, input),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: postKeys.feed(),
      }),
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deletePost,
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: postKeys.feed(),
      }),
  });
}

export function useSharePost() {
  return useMutation({
    mutationFn: ({ postId, recipientId }: { postId: string; recipientId: string }) =>
      sharePostWithConnection(postId, recipientId),
  });
}

export function useRepostPost() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: repostPost, onSuccess: () => queryClient.invalidateQueries({ queryKey: postKeys.feed() }) });
}

export function useUndoRepost() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: undoRepost, onSuccess: () => queryClient.invalidateQueries({ queryKey: postKeys.feed() }) });
}

function useTogglePostLike(shouldLike: boolean) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => (shouldLike ? likePost(postId) : unlikePost(postId)),
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: postKeys.feed() });
      const previous = queryClient.getQueryData<InfiniteData<PostsFeedResponse>>(
        postKeys.feed(),
      );
      queryClient.setQueryData<InfiniteData<PostsFeedResponse>>(
        postKeys.feed(),
        (current) => current && ({
          ...current,
          pages: current.pages.map((page) => ({
            ...page,
            data: page.data.map((post) => {
              if (post.id !== postId || (shouldLike && post.viewerReaction === "like") || (!shouldLike && !post.viewerReaction)) return post;
              const previousReaction = post.viewerReaction;
              const nextReaction = shouldLike ? "like" : null;
              const reactionCounts = { ...post.reactionCounts };
              if (previousReaction) reactionCounts[previousReaction] = Math.max(0, reactionCounts[previousReaction] - 1);
              if (nextReaction) reactionCounts[nextReaction] += 1;
              return {
                ...post,
                isLikedByViewer: shouldLike,
                viewerReaction: nextReaction,
                reactionCounts,
                reactionsCount: Math.max(0, post.reactionsCount + (nextReaction ? Number(!previousReaction) : -Number(Boolean(previousReaction)))),
                likesCount: reactionCounts.like,
              };
            }),
          })),
        }),
      );
      return { previous };
    },
    onError: (_error, _postId, context) => {
      if (context?.previous) queryClient.setQueryData(postKeys.feed(), context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: postKeys.feed() }),
  });
}

export function useLikePost() { return useTogglePostLike(true); }
export function useUnlikePost() { return useTogglePostLike(false); }

export function useReactToPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, reaction }: { postId: string; reaction: PostReaction }) => reactToPost(postId, reaction),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: postKeys.feed() }),
        queryClient.invalidateQueries({ queryKey: ["profiles", "posts"] }),
      ]);
    },
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      postId,
      input,
    }: {
      postId: string;
      input: CreateCommentInput;
    }) => createComment(postId, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: postKeys.comments(variables.postId),
      });
      queryClient.invalidateQueries({
        queryKey: postKeys.feed(),
      });
    },
  });
}

export function useUpdateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      postId,
      commentId,
      input,
    }: {
      postId: string;
      commentId: string;
      input: UpdateCommentInput;
    }) => updateComment(postId, commentId, input),
    onSuccess: (_data, variables) =>
      queryClient.invalidateQueries({
        queryKey: postKeys.comments(variables.postId),
      }),
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      postId,
      commentId,
    }: {
      postId: string;
      commentId: string;
    }) => deleteComment(postId, commentId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: postKeys.comments(variables.postId),
      });
      queryClient.invalidateQueries({
        queryKey: postKeys.feed(),
      });
    },
  });
}
