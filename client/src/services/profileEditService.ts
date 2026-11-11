import type { ApiSuccessResponse } from "../types/api";
import type { OwnerProfile } from "../types/profile";
import type {
  EducationInput,
  ExperienceInput,
  ProfilePatch,
} from "../types/profileEdit";
import { apiClient } from "./apiClient";

// Every endpoint answers with the full, updated profile.
type OwnerProfileResponse = ApiSuccessResponse<{ profile: OwnerProfile }>;

export async function updateProfile(
  patch: ProfilePatch,
): Promise<OwnerProfile> {
  const response = await apiClient.patch<OwnerProfileResponse>(
    "/profiles/me",
    patch,
  );
  return response.data.data.profile;
}

export async function replaceSkills(skills: string[]): Promise<OwnerProfile> {
  const response = await apiClient.put<OwnerProfileResponse>(
    "/profiles/me/skills",
    { skills },
  );
  return response.data.data.profile;
}

// ---------------------------------------------------------------- experience

export async function createExperience(
  input: ExperienceInput,
): Promise<OwnerProfile> {
  const response = await apiClient.post<OwnerProfileResponse>(
    "/profiles/me/experiences",
    input,
  );
  return response.data.data.profile;
}

export async function replaceExperience(
  id: string,
  input: ExperienceInput,
): Promise<OwnerProfile> {
  const response = await apiClient.put<OwnerProfileResponse>(
    `/profiles/me/experiences/${encodeURIComponent(id)}`,
    input,
  );
  return response.data.data.profile;
}

export async function deleteExperience(id: string): Promise<OwnerProfile> {
  const response = await apiClient.delete<OwnerProfileResponse>(
    `/profiles/me/experiences/${encodeURIComponent(id)}`,
  );
  return response.data.data.profile;
}

// ----------------------------------------------------------------- education

export async function createEducation(
  input: EducationInput,
): Promise<OwnerProfile> {
  const response = await apiClient.post<OwnerProfileResponse>(
    "/profiles/me/education",
    input,
  );
  return response.data.data.profile;
}

export async function replaceEducation(
  id: string,
  input: EducationInput,
): Promise<OwnerProfile> {
  const response = await apiClient.put<OwnerProfileResponse>(
    `/profiles/me/education/${encodeURIComponent(id)}`,
    input,
  );
  return response.data.data.profile;
}

export async function deleteEducation(id: string): Promise<OwnerProfile> {
  const response = await apiClient.delete<OwnerProfileResponse>(
    `/profiles/me/education/${encodeURIComponent(id)}`,
  );
  return response.data.data.profile;
}
