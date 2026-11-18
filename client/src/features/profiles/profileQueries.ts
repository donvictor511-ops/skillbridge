import { useQuery } from "@tanstack/react-query";
import { profileRootKey } from "../../lib/queryKeys";
import { getMyProfile, getProfile } from "../../services/profileService";

export const profileKeys = {
  me: [...profileRootKey, "me"] as const,
  detail: (userId: string) => [...profileRootKey, "detail", userId] as const,
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
