import { useState } from "react";
import type { FormEvent, ReactElement } from "react";
import {
  ErrorMessage,
  Button,
  Input,
  Select,
  Textarea,
} from "../../../components/ui";
import { useUnsavedChangesWarning } from "../../../hooks/useUnsavedChangesWarning";
import { getApiErrorInfo } from "../../../lib/apiError";
import { toTopLevelErrors } from "../../../lib/fieldErrors";
import { focusFirstInvalidField } from "../../../lib/forms";
import { toFieldErrors } from "../../../lib/zodErrors";
import type { ProfileBusiness } from "../../../types/profile";
import type { BusinessInput } from "../../../types/portfolioEdit";
import { ProfileSection } from "../ProfileSection";
import { ConfirmDelete } from "./ConfirmDelete";
import { businessFormSchema, companySizeOptions } from "./portfolioSchemas";
import type { BusinessFormValues } from "./portfolioSchemas";
import { useDeleteBusiness, useSaveBusiness } from "./portfolioMutations";
import { SaveBar } from "./SaveBar";

const FIELD_ORDER = [
  "companyName",
  "websiteUrl",
  "industry",
  "sizeRange",
  "about",
] as const;

const EMPTY_VALUES: BusinessFormValues = {
  companyName: "",
  websiteUrl: "",
  industry: "",
  sizeRange: "",
  about: "",
};

// The saved company details -> the text the form shows.
function toValues(business: ProfileBusiness | null): BusinessFormValues {
  if (!business) {
    return EMPTY_VALUES;
  }

  const size = business.sizeRange ?? "";
  const knownSize = companySizeOptions.some((option) => option.value === size);

  return {
    companyName: business.companyName,
    websiteUrl: business.websiteUrl ?? "",
    industry: business.industry ?? "",
    sizeRange: knownSize ? (size as BusinessFormValues["sizeRange"]) : "",
    about: business.about ?? "",
  };
}

function toInput(values: BusinessFormValues): BusinessInput {
  return {
    companyName: values.companyName.trim(),
    websiteUrl:
      values.websiteUrl.trim() === "" ? null : values.websiteUrl.trim(),
    industry: values.industry.trim() === "" ? null : values.industry.trim(),
    sizeRange: values.sizeRange === "" ? null : values.sizeRange,
    about: values.about.trim() === "" ? null : values.about.trim(),
  };
}

// Same text once spaces at the ends are ignored.
function sameValues(a: BusinessFormValues, b: BusinessFormValues): boolean {
  return (
    a.companyName.trim() === b.companyName.trim() &&
    a.websiteUrl.trim() === b.websiteUrl.trim() &&
    a.industry.trim() === b.industry.trim() &&
    a.sizeRange === b.sizeRange &&
    a.about.trim() === b.about.trim()
  );
}

interface BusinessFormProps {
  business: ProfileBusiness | null;
}

// Only shown for client or business accounts. (The SERVER enforces this rule
// too: other accounts get a 403.)
export function BusinessForm({ business }: BusinessFormProps): ReactElement {
  const saveMutation = useSaveBusiness();
  const deleteMutation = useDeleteBusiness();

  const [saved, setSaved] = useState<BusinessFormValues>(() =>
    toValues(business),
  );
  const [values, setValues] = useState<BusinessFormValues>(() =>
    toValues(business),
  );
  const [hasSavedCompany, setHasSavedCompany] = useState<boolean>(
    business !== null,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState<boolean>(false);
  const [isConfirmingRemove, setIsConfirmingRemove] = useState<boolean>(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const isDirty = !sameValues(saved, values);

  useUnsavedChangesWarning(isDirty);

  function change(next: Partial<BusinessFormValues>): void {
    setValues((previous) => ({ ...previous, ...next }));
    setErrors((previous) => {
      const remaining = { ...previous };
      for (const key of Object.keys(next)) {
        delete remaining[key];
      }
      return remaining;
    });
    setJustSaved(false);
  }

  function handleCancel(): void {
    setValues(saved);
    setErrors({});
    setFormError(null);
    setJustSaved(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setFormError(null);

    const result = businessFormSchema.safeParse(values);
    if (!result.success) {
      const fieldErrors = toFieldErrors(result.error);
      setErrors(fieldErrors);
      focusFirstInvalidField(fieldErrors, FIELD_ORDER, "biz");
      return;
    }

    if (!isDirty) {
      return;
    }

    saveMutation.mutate(toInput(result.data), {
      onSuccess: (profile) => {
        const next = toValues(profile.business);
        setSaved(next);
        setValues(next);
        setHasSavedCompany(profile.business !== null);
        setErrors({});
        setJustSaved(true);
      },
      onError: (error: unknown) => {
        const info = getApiErrorInfo(error);
        const topLevel = toTopLevelErrors(info.fieldErrors);

        setErrors(topLevel);
        setFormError(info.message);
        focusFirstInvalidField(topLevel, FIELD_ORDER, "biz");
      },
    });
  }

  function handleConfirmRemove(): void {
    setRemoveError(null);
    deleteMutation.mutate(undefined, {
      onSuccess: () => {
        setSaved(EMPTY_VALUES);
        setValues(EMPTY_VALUES);
        setHasSavedCompany(false);
        setErrors({});
        setFormError(null);
        setJustSaved(false);
        setIsConfirmingRemove(false);
      },
      onError: (error: unknown) => {
        setRemoveError(getApiErrorInfo(error).message);
      },
    });
  }

  return (
    <ProfileSection
      title="Company details"
      description="Shown on your profile because you have a client or business account."
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {formError ? (
          <ErrorMessage
            title="Could not save the company details"
            message={formError}
          />
        ) : null}

        <Input
          id="biz-companyName"
          label="Company name"
          required
          autoComplete="organization"
          value={values.companyName}
          onChange={(event) => change({ companyName: event.target.value })}
          error={errors.companyName}
        />

        <Input
          id="biz-websiteUrl"
          label="Website (optional)"
          type="url"
          inputMode="url"
          autoComplete="off"
          hint="It must start with https://"
          value={values.websiteUrl}
          onChange={(event) => change({ websiteUrl: event.target.value })}
          error={errors.websiteUrl}
        />

        <Input
          id="biz-industry"
          label="Industry (optional)"
          hint="For example: Software, Education, Retail."
          value={values.industry}
          onChange={(event) => change({ industry: event.target.value })}
          error={errors.industry}
        />

        <Select
          id="biz-sizeRange"
          label="Company size (optional)"
          value={values.sizeRange}
          onChange={(event) => {
            const next = event.target.value;
            const match = companySizeOptions.find(
              (option) => option.value === next,
            );
            change({ sizeRange: match ? match.value : "" });
          }}
          error={errors.sizeRange}
        >
          <option value="">Not set</option>
          {companySizeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>

        <Textarea
          id="biz-about"
          label="About the company (optional)"
          rows={5}
          hint={`${values.about.length} of 2000 characters.`}
          value={values.about}
          onChange={(event) => change({ about: event.target.value })}
          error={errors.about}
        />

        <SaveBar
          isDirty={isDirty}
          isSaving={saveMutation.isPending}
          justSaved={justSaved}
          onCancel={handleCancel}
        />
      </form>

      {hasSavedCompany ? (
        <div className="mt-6 border-t border-line pt-4">
          {isConfirmingRemove ? (
            <ConfirmDelete
              question="Remove your company details?"
              isDeleting={deleteMutation.isPending}
              error={removeError}
              onConfirm={handleConfirmRemove}
              onCancel={() => setIsConfirmingRemove(false)}
            />
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setRemoveError(null);
                setIsConfirmingRemove(true);
              }}
            >
              Remove company details
            </Button>
          )}
        </div>
      ) : null}
    </ProfileSection>
  );
}
