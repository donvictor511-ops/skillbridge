import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { profileRootKey } from "../../lib/queryKeys";
import { getMyProfile, getProfile } from "../../services/profileService";
import { getAuthorPosts } from "../posts/postsService";
import type { PostsFeedResponse } from "../posts/posts.types";

export const profileKeys = {
  me: [...profileRootKey, "me"] as const,
  detail: (userId: string) => [...profileRootKey, "detail", userId] as const,
  posts: (userId: string) => [...profileRootKey, "posts", userId] as const,
};

// retry is false: a 401 or 404 is a real answer, not a glitch to retry.
export function useMyProfile() {
  return useQuery({
    queryKey: profileKeys.me,
    queryFn: getMyProfile,
    retry: false,
    staleTime: 30_000,
  });
}

export function useProfilePosts(userId: string) {
  return useInfiniteQuery({
    queryKey: profileKeys.posts(userId),
    queryFn: ({ pageParam }) => getAuthorPosts(userId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: PostsFeedResponse) => lastPage.nextCursor ?? undefined,
    enabled: userId !== "",
    retry: false,
    staleTime: 15_000,
  });
}

export function useProfile(userId: string, refetchInterval?: number | false) {
  return useQuery({
    queryKey: profileKeys.detail(userId),
    queryFn: () => getProfile(userId),
    enabled: userId !== "",
    retry: false,
    staleTime: 30_000,
    refetchInterval,
  });
}
