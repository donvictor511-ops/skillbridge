import { useState } from "react";
import type { FormEvent, ReactElement } from "react";
import { CircleAlert } from "lucide-react";
import { ChoiceGroup } from "../../../components/forms/ChoiceGroup";
import type { ChoiceOption } from "../../../components/forms/ChoiceGroup";
import { Button, ErrorMessage, Input, Textarea } from "../../../components/ui";
import { getApiErrorInfo } from "../../../lib/apiError";
import { toTopLevelErrors } from "../../../lib/fieldErrors";
import { focusFirstInvalidField } from "../../../lib/forms";
import { isSafeHttpsUrl } from "../../../lib/url";
import { toFieldErrors } from "../../../lib/zodErrors";
import type { ProfileProject, ProfileSkill } from "../../../types/profile";
import type { ProjectInput } from "../../../types/portfolioEdit";
import { MAX_PROJECT_SKILLS, projectFormSchema } from "./portfolioSchemas";
import type { ProjectFormValues } from "./portfolioSchemas";
import { useCreateProject, useReplaceProject } from "./portfolioMutations";

const FIELD_ORDER = [
  "title",
  "description",
  "projectUrl",
  "imageUrl",
  "skillIds",
] as const;

function toFormValues(
  initial: ProfileProject | undefined,
  profileSkills: ProfileSkill[],
): ProjectFormValues {
  if (!initial) {
    return {
      title: "",
      description: "",
      projectUrl: "",
      imageUrl: "",
      skillIds: [],
    };
  }

  // Only keep skills that are still on the profile.
  const profileSkillIds = profileSkills.map((skill) => skill.id);

  return {
    title: initial.title,
    description: initial.description,
    projectUrl: initial.projectUrl ?? "",
    imageUrl: initial.imageUrl ?? "",
    skillIds: initial.skills
      .map((skill) => skill.id)
      .filter((id) => profileSkillIds.includes(id)),
  };
}

function toInput(values: ProjectFormValues): ProjectInput {
  return {
    title: values.title.trim(),
    description: values.description.trim(),
    projectUrl:
      values.projectUrl.trim() === "" ? null : values.projectUrl.trim(),
    imageUrl: values.imageUrl.trim() === "" ? null : values.imageUrl.trim(),
    skillIds: values.skillIds,
  };
}

interface ImagePreviewProps {
  url: string;
}

// Loads the picture ONLY when this component is shown, which happens only after
// the person presses "Show preview". If the picture cannot be loaded, we say so
// in words, with an icon.
function ImagePreview({ url }: ImagePreviewProps): ReactElement {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  if (failedUrl === url) {
    return (
      <p className="flex items-start gap-1.5 text-sm text-danger-strong">
        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          We could not load this image. Check the link, or leave it empty. Your
          project will show a neutral icon instead.
        </span>
      </p>
    );
  }

  return (
    <img
      src={url}
      alt="Preview of the project image"
      referrerPolicy="no-referrer"
      onError={() => setFailedUrl(url)}
      className="aspect-video w-full rounded-xl border border-line object-cover"
    />
  );
}

interface ProjectFormProps {
  // The skills on your profile: the only skills a project can use.
  profileSkills: ProfileSkill[];
  // Present when editing an existing project. Missing when adding a new one.
  initial?: ProfileProject;
  onSaved: () => void;
  onCancel: () => void;
}

export function ProjectForm({
  profileSkills,
  initial,
  onSaved,
  onCancel,
}: ProjectFormProps): ReactElement {
  const createMutation = useCreateProject();
  const replaceMutation = useReplaceProject();

  const [values, setValues] = useState<ProjectFormValues>(() =>
    toFormValues(initial, profileSkills),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  // The link whose picture the person asked to see.
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const isSaving = createMutation.isPending || replaceMutation.isPending;

  const trimmedImageUrl = values.imageUrl.trim();
  const canPreview = isSafeHttpsUrl(trimmedImageUrl);
  // Show the preview only while the field still holds the link that was previewed.
  const showPreview = previewUrl !== null && previewUrl === trimmedImageUrl;

  const skillOptions: ChoiceOption<string>[] = profileSkills.map((skill) => ({
    value: skill.id,
    label: skill.name,
  }));

  function change(next: Partial<ProjectFormValues>): void {
    setValues((previous) => ({ ...previous, ...next }));
    setErrors((previous) => {
      const remaining = { ...previous };
      for (const key of Object.keys(next)) {
        delete remaining[key];
      }
      return remaining;
    });
  }

  function handleError(error: unknown): void {
    const info = getApiErrorInfo(error);
    const topLevel = toTopLevelErrors(info.fieldErrors);

    setErrors(topLevel);
    setFormError(info.message);
    focusFirstInvalidField(topLevel, FIELD_ORDER, "proj");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setFormError(null);

    const result = projectFormSchema.safeParse(values);
    if (!result.success) {
      const fieldErrors = toFieldErrors(result.error);
      setErrors(fieldErrors);
      focusFirstInvalidField(fieldErrors, FIELD_ORDER, "proj");
      return;
    }

    const input = toInput(result.data);
    const callbacks = { onSuccess: () => onSaved(), onError: handleError };

    if (initial) {
      replaceMutation.mutate({ id: initial.id, input }, callbacks);
    } else {
      createMutation.mutate(input, callbacks);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <h3 className="text-base font-semibold text-navy">
        {initial ? "Edit project" : "Add a project"}
      </h3>

      {formError ? (
        <ErrorMessage title="Could not save this project" message={formError} />
      ) : null}

      <Input
        id="proj-title"
        label="Project title"
        required
        autoFocus
        value={values.title}
        onChange={(event) => change({ title: event.target.value })}
        error={errors.title}
      />

      <Textarea
        id="proj-description"
        label="Description"
        required
        rows={5}
        hint={`What it is, what you did, and what you learned. ${values.description.length} of 2000 characters.`}
        value={values.description}
        onChange={(event) => change({ description: event.target.value })}
        error={errors.description}
      />

      <Input
        id="proj-projectUrl"
        label="Project link (optional)"
        type="url"
        inputMode="url"
        autoComplete="off"
        hint="A link to the live project or its code. It must start with https://"
        value={values.projectUrl}
        onChange={(event) => change({ projectUrl: event.target.value })}
        error={errors.projectUrl}
      />

      <div>
        <Input
          id="proj-imageUrl"
          label="Image link (optional)"
          type="url"
          inputMode="url"
          autoComplete="off"
          hint="A picture of the project. Uploads are not available yet. Use a link starting with https://"
          value={values.imageUrl}
          onChange={(event) => change({ imageUrl: event.target.value })}
          error={errors.imageUrl}
        />

        <div className="mt-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={!canPreview}
            onClick={() => setPreviewUrl(trimmedImageUrl)}
          >
            Show preview
          </Button>
          <p className="mt-1 text-sm text-muted">
            The preview loads the picture from that website. Nothing loads until
            you press this button.
          </p>
        </div>

        {showPreview && previewUrl !== null ? (
          <div className="mt-3 max-w-md">
            <ImagePreview url={previewUrl} />
          </div>
        ) : null}
      </div>

      {profileSkills.length === 0 ? (
        <p className="rounded-xl border border-line bg-page p-3 text-sm text-muted">
          You have no skills on your profile yet. Add skills in the{" "}
          <span className="font-semibold text-ink">Skills</span> section first,
          then come back to link them to this project.
        </p>
      ) : (
        <ChoiceGroup
          id="proj-skillIds"
          legend="Skills used in this project"
          hint={`Choose from your own skills. Up to ${MAX_PROJECT_SKILLS}. This is the proof behind each skill.`}
          options={skillOptions}
          selected={values.skillIds}
          maxSelected={MAX_PROJECT_SKILLS}
          onChange={(next) => change({ skillIds: next })}
          error={errors.skillIds}
        />
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button type="submit" loading={isSaving}>
          {isSaving ? "Saving..." : initial ? "Save project" : "Add project"}
        </Button>
      </div>
    </form>
  );
}
