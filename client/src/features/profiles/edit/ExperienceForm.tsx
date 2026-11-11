import { useState } from "react";
import type { FormEvent, ReactElement } from "react";
import { Button, ErrorMessage, Input, Textarea } from "../../../components/ui";
import { getApiErrorInfo } from "../../../lib/apiError";
import { toTopLevelErrors } from "../../../lib/fieldErrors";
import { focusFirstInvalidField } from "../../../lib/forms";
import { toFieldErrors } from "../../../lib/zodErrors";
import type { ProfileExperience } from "../../../types/profile";
import type { ExperienceInput } from "../../../types/profileEdit";
import { experienceFormSchema } from "./editSchemas";
import type { ExperienceFormValues } from "./editSchemas";
import {
  useCreateExperience,
  useReplaceExperience,
} from "./profileEditMutations";

const FIELD_ORDER = [
  "title",
  "company",
  "location",
  "startDate",
  "endDate",
  "description",
] as const;

function toFormValues(
  experience: ProfileExperience | undefined,
): ExperienceFormValues {
  if (!experience) {
    return {
      title: "",
      company: "",
      location: "",
      startDate: "",
      isCurrent: false,
      endDate: "",
      description: "",
    };
  }

  return {
    title: experience.title,
    company: experience.company,
    location: experience.location ?? "",
    // The API sends "YYYY-MM-DD". A month input wants "YYYY-MM".
    startDate: experience.startDate.slice(0, 7),
    isCurrent: experience.endDate === null,
    endDate: experience.endDate ? experience.endDate.slice(0, 7) : "",
    description: experience.description ?? "",
  };
}

function toInput(values: ExperienceFormValues): ExperienceInput {
  return {
    title: values.title.trim(),
    company: values.company.trim(),
    location: values.location.trim() === "" ? null : values.location.trim(),
    startDate: values.startDate,
    endDate: values.isCurrent ? null : values.endDate,
    description:
      values.description.trim() === "" ? null : values.description.trim(),
  };
}

interface ExperienceFormProps {
  // Present when editing an existing job. Missing when adding a new one.
  initial?: ProfileExperience;
  onSaved: () => void;
  onCancel: () => void;
}

export function ExperienceForm({
  initial,
  onSaved,
  onCancel,
}: ExperienceFormProps): ReactElement {
  const createMutation = useCreateExperience();
  const replaceMutation = useReplaceExperience();

  const [values, setValues] = useState<ExperienceFormValues>(() =>
    toFormValues(initial),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const isSaving = createMutation.isPending || replaceMutation.isPending;

  function change(next: Partial<ExperienceFormValues>): void {
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
    focusFirstInvalidField(topLevel, FIELD_ORDER, "exp");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setFormError(null);

    const result = experienceFormSchema.safeParse(values);
    if (!result.success) {
      const fieldErrors = toFieldErrors(result.error);
      setErrors(fieldErrors);
      focusFirstInvalidField(fieldErrors, FIELD_ORDER, "exp");
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
        {initial ? "Edit job" : "Add a job"}
      </h3>

      {formError ? (
        <ErrorMessage title="Could not save this job" message={formError} />
      ) : null}

      <Input
        id="exp-title"
        label="Job title"
        required
        autoFocus
        value={values.title}
        onChange={(event) => change({ title: event.target.value })}
        error={errors.title}
      />

      <Input
        id="exp-company"
        label="Company"
        required
        autoComplete="organization"
        value={values.company}
        onChange={(event) => change({ company: event.target.value })}
        error={errors.company}
      />

      <Input
        id="exp-location"
        label="Location (optional)"
        value={values.location}
        onChange={(event) => change({ location: event.target.value })}
        error={errors.location}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          id="exp-startDate"
          label="Start month"
          type="month"
          placeholder="2023-03"
          hint="Format: YYYY-MM"
          required
          value={values.startDate}
          onChange={(event) => change({ startDate: event.target.value })}
          error={errors.startDate}
        />
        <Input
          id="exp-endDate"
          label="End month"
          type="month"
          placeholder="2024-06"
          hint="Format: YYYY-MM"
          disabled={values.isCurrent}
          value={values.endDate}
          onChange={(event) => change({ endDate: event.target.value })}
          error={errors.endDate}
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          checked={values.isCurrent}
          onChange={(event) =>
            change({
              isCurrent: event.target.checked,
              // A current job has no end date.
              endDate: event.target.checked ? "" : values.endDate,
            })
          }
          className="h-5 w-5 rounded border-line accent-brand"
        />
        I currently work here
      </label>

      <Textarea
        id="exp-description"
        label="Description (optional)"
        rows={4}
        hint={`${values.description.length} of 2000 characters.`}
        value={values.description}
        onChange={(event) => change({ description: event.target.value })}
        error={errors.description}
      />

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button type="submit" loading={isSaving}>
          {isSaving ? "Saving..." : initial ? "Save job" : "Add job"}
        </Button>
      </div>
    </form>
  );
}
