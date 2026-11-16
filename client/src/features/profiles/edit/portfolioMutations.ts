import {
  createProject,
  deleteBusiness,
  deleteProject,
  replaceProject,
  saveBusiness,
} from "../../../services/portfolioEditService";
import type { ProjectInput } from "../../../types/portfolioEdit";
import { useOwnerProfileMutation } from "./profileEditMutations";

interface ReplaceProjectVariables {
  id: string;
  input: ProjectInput;
}

export function useCreateProject() {
  return useOwnerProfileMutation(createProject);
}

export function useReplaceProject() {
  return useOwnerProfileMutation(({ id, input }: ReplaceProjectVariables) =>
    replaceProject(id, input),
  );
}

export function useDeleteProject() {
  return useOwnerProfileMutation(deleteProject);
}

export function useSaveBusiness() {
  return useOwnerProfileMutation(saveBusiness);
}

// "void" means: this action needs no input. We can call it with mutate().
export function useDeleteBusiness() {
  return useOwnerProfileMutation<void>(deleteBusiness);
}
