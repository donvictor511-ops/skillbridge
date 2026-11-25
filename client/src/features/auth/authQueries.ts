import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { profileRootKey } from "../../lib/queryKeys";
import {
  getCurrentUser,
  login,
  logout,
  register,
} from "../../services/authService";

// One place for the cache key, so every file refers to the same data.
export const authKeys = {
  me: ["auth", "me"] as const,
};

export const NEW_ACCOUNT_SESSION_KEY = "skillbridge:new-account";

// "Who is logged in?" The result is a user, or null when logged out.
export function useCurrentUser() {
  return useQuery({
    queryKey: authKeys.me,
    queryFn: getCurrentUser,
    // Retry transient network failures so the signed-in area can recover when
    // the connection returns. HTTP errors still stop after the normal limit.
    retry: (failureCount, error) => {
      if (axios.isAxiosError(error) && error.response && error.response.status < 500) return false;
      return failureCount < 2;
    },
    refetchOnReconnect: "always",
    staleTime: 60_000,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: login,
    onSuccess: (user) => {
      // Remember the user right away. GuestRoute then redirects by itself.
      queryClient.setQueryData(authKeys.me, user);
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: register,
    onSuccess: (user) => {
      window.sessionStorage.setItem(NEW_ACCOUNT_SESSION_KEY, "1");
      queryClient.setQueryData(authKeys.me, user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      // The server ended the session. Remember that in the cache too.
      queryClient.setQueryData(authKeys.me, null);
      // Forget every cached profile, so a members-only profile cannot be
      // shown again from memory (for example with the Back button).
      queryClient.removeQueries({ queryKey: profileRootKey });
    },
  });
}
