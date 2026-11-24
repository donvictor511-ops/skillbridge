import { useMutation, useQueryClient } from "@tanstack/react-query";
import { completeOnboarding } from "../../services/onboardingService";
import { authKeys } from "../auth/authQueries";
import { profileRootKey } from "../../lib/queryKeys";

export function useCompleteOnboarding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: completeOnboarding,
    onSuccess: async (user) => {
      // The user now has onboardedAt set. OnboardingPage notices and sends
      // the person to the dashboard.
      queryClient.setQueryData(authKeys.me, user);
      // A profile query may have been cached before onboarding created the
      // profile row. Refresh it so the uploaded Cloudinary avatar appears
      // immediately after signup instead of requiring a manual profile edit.
      await queryClient.invalidateQueries({ queryKey: profileRootKey });
    },
  });
}
