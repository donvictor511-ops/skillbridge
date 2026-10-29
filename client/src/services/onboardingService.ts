import type { ApiSuccessResponse } from "../types/api";
import type { AuthUser } from "../types/auth";
import type { OnboardingInput } from "../types/onboarding";
import { apiClient } from "./apiClient";

interface UserResponseData {
  user: AuthUser;
}

// Saves the whole onboarding in one request. Returns the updated user.
export async function completeOnboarding(
  input: OnboardingInput,
): Promise<AuthUser> {
  const response = await apiClient.post<ApiSuccessResponse<UserResponseData>>(
    "/onboarding",
    input,
  );
  return response.data.data.user;
}
