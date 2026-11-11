import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createEducation,
  createExperience,
  deleteEducation,
  deleteExperience,
  replaceEducation,
  replaceExperience,
  replaceSkills,
  updateProfile,
} from "../../../services/profileEditService";
import type { OwnerProfile } from "../../../types/profile";
import type {
  EducationInput,
  ExperienceInput,
} from "../../../types/profileEdit";
import { profileKeys } from "../profileQueries";

// Every save returns the FULL updated profile. We put it straight into the
// cache, so this page and /profile/me both show it at once. There is only one
// copy of the data, so it cannot get out of date.
function useOwnerProfileMutation<TVariables>(
  mutationFn: (variables: TVariables) => Promise<OwnerProfile>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: (profile) => {
      queryClient.setQueryData(profileKeys.me, profile);
    },
  });
}

export function useUpdateProfile() {
  return useOwnerProfileMutation(updateProfile);
}

export function useReplaceSkills() {
  return useOwnerProfileMutation(replaceSkills);
}

// ---------------------------------------------------------------- experience

interface ReplaceExperienceVariables {
  id: string;
  input: ExperienceInput;
}

export function useCreateExperience() {
  return useOwnerProfileMutation(createExperience);
}

export function useReplaceExperience() {
  return useOwnerProfileMutation(({ id, input }: ReplaceExperienceVariables) =>
    replaceExperience(id, input),
  );
}

export function useDeleteExperience() {
  return useOwnerProfileMutation(deleteExperience);
}

// ----------------------------------------------------------------- education

interface ReplaceEducationVariables {
  id: string;
  input: EducationInput;
}

export function useCreateEducation() {
  return useOwnerProfileMutation(createEducation);
}

export function useReplaceEducation() {
  return useOwnerProfileMutation(({ id, input }: ReplaceEducationVariables) =>
    replaceEducation(id, input),
  );
}

export function useDeleteEducation() {
  return useOwnerProfileMutation(deleteEducation);
}
