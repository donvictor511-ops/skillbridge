import type { ApiSuccessResponse } from "../types/api";
import type { OwnerProfile } from "../types/profile";
import type { BusinessInput, ProjectInput } from "../types/portfolioEdit";
import { apiClient } from "./apiClient";

// Every endpoint answers with the full, updated profile.
type OwnerProfileResponse = ApiSuccessResponse<{ profile: OwnerProfile }>;

// ------------------------------------------------------------------ projects

export async function createProject(
  input: ProjectInput,
): Promise<OwnerProfile> {
  const response = await apiClient.post<OwnerProfileResponse>(
    "/profiles/me/projects",
    input,
  );
  return response.data.data.profile;
}

export async function replaceProject(
  id: string,
  input: ProjectInput,
): Promise<OwnerProfile> {
  const response = await apiClient.put<OwnerProfileResponse>(
    `/profiles/me/projects/${encodeURIComponent(id)}`,
    input,
  );
  return response.data.data.profile;
}

export async function deleteProject(id: string): Promise<OwnerProfile> {
  const response = await apiClient.delete<OwnerProfileResponse>(
    `/profiles/me/projects/${encodeURIComponent(id)}`,
  );
  return response.data.data.profile;
}

// ------------------------------------------------------------------- company

export async function saveBusiness(
  input: BusinessInput,
): Promise<OwnerProfile> {
  const response = await apiClient.put<OwnerProfileResponse>(
    "/profiles/me/business",
    input,
  );
  return response.data.data.profile;
}

export async function deleteBusiness(): Promise<OwnerProfile> {
  const response = await apiClient.delete<OwnerProfileResponse>(
    "/profiles/me/business",
  );
  return response.data.data.profile;
}
