import { useMutation, useQueryClient } from "@tanstack/react-query";
import { profileKeys } from "../profiles/profileQueries";
import { followUser, unfollowUser } from "./followsService";

export function useFollowUser(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => followUser(userId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: profileKeys.detail(userId) }),
        queryClient.invalidateQueries({ queryKey: profileKeys.me }),
      ]);
    },
  });
}

export function useUnfollowUser(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => unfollowUser(userId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: profileKeys.detail(userId) }),
        queryClient.invalidateQueries({ queryKey: profileKeys.me }),
      ]);
    },
  });
}
