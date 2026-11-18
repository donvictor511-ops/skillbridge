import type { ApiSuccessResponse } from "../types/api";
import type { OwnerProfile, PublicProfile } from "../types/profile";
import { apiClient } from "./apiClient";

interface ProfileResponseData<T> {
  profile: T;
}

export type ProfileImageType = "avatar" | "cover";

interface ProfileImageResponse {
  imageUrl: string;
  imageType: ProfileImageType;
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

// Upload a profile picture or cover image to Cloudinary through our backend.
export async function uploadProfileImage(
  imageType: ProfileImageType,
  file: File,
): Promise<ProfileImageResponse> {
  const formData = new FormData();
  formData.append("image", file);

  const response = await apiClient.post<
    ApiSuccessResponse<ProfileImageResponse>
  >(`/profiles/me/images/${imageType}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data.data;
}
