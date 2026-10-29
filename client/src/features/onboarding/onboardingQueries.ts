import { useMutation, useQueryClient } from "@tanstack/react-query";
import { completeOnboarding } from "../../services/onboardingService";
import { authKeys } from "../auth/authQueries";

export function useCompleteOnboarding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: completeOnboarding,
    onSuccess: (user) => {
      // The user now has onboardedAt set. OnboardingPage notices and sends
      // the person to the dashboard.
      queryClient.setQueryData(authKeys.me, user);
    },
  });
}
