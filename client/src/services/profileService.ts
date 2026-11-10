import type { ApiSuccessResponse } from "../types/api";
import type { OwnerProfile, PublicProfile } from "../types/profile";
import { apiClient } from "./apiClient";

interface ProfileResponseData<T> {
  profile: T;
}

// Your own profile (needs a login).
export async function getMyProfile(): Promise<OwnerProfile> {
  const response =
    await apiClient.get<ApiSuccessResponse<ProfileResponseData<OwnerProfile>>>(
      "/profiles/me",
    );
  return response.data.data.profile;
}

// Someone's profile, as the current visitor is allowed to see it.
export async function getProfile(userId: string): Promise<PublicProfile> {
  const response = await apiClient.get<
    ApiSuccessResponse<ProfileResponseData<PublicProfile>>
  >(`/profiles/${encodeURIComponent(userId)}`);
  return response.data.data.profile;
}
