import { useState } from "react";
import type { FormEvent, ReactElement } from "react";
import { Button, ErrorMessage, Input, Textarea } from "../../../components/ui";
import { getApiErrorInfo } from "../../../lib/apiError";
import { toTopLevelErrors } from "../../../lib/fieldErrors";
import { focusFirstInvalidField } from "../../../lib/forms";
import { toFieldErrors } from "../../../lib/zodErrors";
import type { ProfileEducation } from "../../../types/profile";
import type { EducationInput } from "../../../types/profileEdit";
import { educationFormSchema } from "./editSchemas";
import type { EducationFormValues } from "./editSchemas";
import {
  useCreateEducation,
  useReplaceEducation,
} from "./profileEditMutations";

const FIELD_ORDER = [
  "school",
  "degree",
  "fieldOfStudy",
  "startYear",
  "endYear",
  "description",
] as const;

function toFormValues(
  entry: ProfileEducation | undefined,
): EducationFormValues {
  if (!entry) {
    return {
      school: "",
      degree: "",
      fieldOfStudy: "",
      startYear: "",
      endYear: "",
      description: "",
    };
  }

  return {
    school: entry.school,
    degree: entry.degree ?? "",
    fieldOfStudy: entry.fieldOfStudy ?? "",
    startYear: entry.startYear === null ? "" : String(entry.startYear),
    endYear: entry.endYear === null ? "" : String(entry.endYear),
    description: entry.description ?? "",
  };
}

// Years are typed as text in the form, but the API wants real numbers (or null).
function toInput(values: EducationFormValues): EducationInput {
  return {
    school: values.school.trim(),
    degree: values.degree.trim() === "" ? null : values.degree.trim(),
    fieldOfStudy:
      values.fieldOfStudy.trim() === "" ? null : values.fieldOfStudy.trim(),
    startYear: values.startYear.trim() === "" ? null : Number(values.startYear),
    endYear: values.endYear.trim() === "" ? null : Number(values.endYear),
    description:
      values.description.trim() === "" ? null : values.description.trim(),
  };
}

interface EducationFormProps {
  initial?: ProfileEducation;
  onSaved: () => void;
  onCancel: () => void;
}

export function EducationForm({
  initial,
  onSaved,
  onCancel,
}: EducationFormProps): ReactElement {
  const createMutation = useCreateEducation();
  const replaceMutation = useReplaceEducation();

  const [values, setValues] = useState<EducationFormValues>(() =>
    toFormValues(initial),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const isSaving = createMutation.isPending || replaceMutation.isPending;

  function change(next: Partial<EducationFormValues>): void {
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
    focusFirstInvalidField(topLevel, FIELD_ORDER, "edu");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setFormError(null);

    const result = educationFormSchema.safeParse(values);
    if (!result.success) {
      const fieldErrors = toFieldErrors(result.error);
      setErrors(fieldErrors);
      focusFirstInvalidField(fieldErrors, FIELD_ORDER, "edu");
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
        {initial ? "Edit education" : "Add education"}
      </h3>

      {formError ? (
        <ErrorMessage title="Could not save this entry" message={formError} />
      ) : null}

      <Input
        id="edu-school"
        label="School or course"
        required
        autoFocus
        autoComplete="organization"
        value={values.school}
        onChange={(event) => change({ school: event.target.value })}
        error={errors.school}
      />

      <Input
        id="edu-degree"
        label="Degree (optional)"
        hint="For example: BSc, MSc, Certificate."
        value={values.degree}
        onChange={(event) => change({ degree: event.target.value })}
        error={errors.degree}
      />

      <Input
        id="edu-fieldOfStudy"
        label="Field of study (optional)"
        value={values.fieldOfStudy}
        onChange={(event) => change({ fieldOfStudy: event.target.value })}
        error={errors.fieldOfStudy}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          id="edu-startYear"
          label="Start year (optional)"
          inputMode="numeric"
          maxLength={4}
          placeholder="2016"
          autoComplete="off"
          value={values.startYear}
          onChange={(event) => change({ startYear: event.target.value })}
          error={errors.startYear}
        />
        <Input
          id="edu-endYear"
          label="End year (optional)"
          inputMode="numeric"
          maxLength={4}
          placeholder="2020"
          hint="Leave empty if you are still studying."
          autoComplete="off"
          value={values.endYear}
          onChange={(event) => change({ endYear: event.target.value })}
          error={errors.endYear}
        />
      </div>

      <Textarea
        id="edu-description"
        label="Notes (optional)"
        rows={3}
        hint={`${values.description.length} of 1000 characters.`}
        value={values.description}
        onChange={(event) => change({ description: event.target.value })}
        error={errors.description}
      />

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button type="submit" loading={isSaving}>
          {isSaving ? "Saving..." : initial ? "Save entry" : "Add entry"}
        </Button>
      </div>
    </form>
  );
}
