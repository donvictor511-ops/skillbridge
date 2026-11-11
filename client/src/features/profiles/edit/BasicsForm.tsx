import { useState } from "react";
import type { FormEvent, ReactElement } from "react";
import { ChoiceGroup } from "../../../components/forms/ChoiceGroup";
import { ErrorMessage, Input, Select, Textarea } from "../../../components/ui";
import { useUnsavedChangesWarning } from "../../../hooks/useUnsavedChangesWarning";
import { getApiErrorInfo } from "../../../lib/apiError";
import { toTopLevelErrors } from "../../../lib/fieldErrors";
import { focusFirstInvalidField } from "../../../lib/forms";
import { toFieldErrors } from "../../../lib/zodErrors";
import type { OwnerProfile, ProfileVisibility } from "../../../types/profile";
import type { ProfilePatch } from "../../../types/profileEdit";
import {
  MAX_INTERESTS,
  goalOptions,
  interestOptions,
} from "../../onboarding/onboardingOptions";
import { ProfileSection } from "../ProfileSection";
import { basicsFormSchema } from "./editSchemas";
import { useUpdateProfile } from "./profileEditMutations";
import { SaveBar } from "./SaveBar";
import { isProfileVisibility, visibilityOptions } from "./visibility";

interface BasicsValues {
  displayName: string;
  headline: string;
  location: string;
  bio: string;
  avatarUrl: string;
  coverUrl: string;
  visibility: ProfileVisibility;
  interests: string[];
  goals: string[];
}

// Field names in the order they appear (used to focus the first problem).
const FIELD_ORDER = [
  "displayName",
  "headline",
  "location",
  "bio",
  "avatarUrl",
  "coverUrl",
  "visibility",
  "interests",
  "goals",
] as const;

// Saved profile -> the text the form shows (empty text for "nothing").
function toValues(profile: OwnerProfile): BasicsValues {
  return {
    displayName: profile.displayName,
    headline: profile.headline ?? "",
    location: profile.location ?? "",
    bio: profile.bio ?? "",
    avatarUrl: profile.avatarUrl ?? "",
    coverUrl: profile.coverUrl ?? "",
    visibility: profile.visibility,
    interests: profile.interests,
    goals: profile.goals,
  };
}

function sameSet(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((item) => b.includes(item));
}

// Compares the draft with the last saved values and returns ONLY what changed.
// This is how we know the form is "dirty": if the patch is empty, nothing changed.
function buildPatch(saved: BasicsValues, draft: BasicsValues): ProfilePatch {
  const patch: ProfilePatch = {};

  const displayName = draft.displayName.trim();
  if (displayName !== saved.displayName.trim()) {
    patch.displayName = displayName;
  }

  const headline = draft.headline.trim();
  if (headline !== saved.headline.trim()) {
    patch.headline = headline === "" ? null : headline;
  }

  const location = draft.location.trim();
  if (location !== saved.location.trim()) {
    patch.location = location === "" ? null : location;
  }

  const bio = draft.bio.trim();
  if (bio !== saved.bio.trim()) {
    patch.bio = bio === "" ? null : bio;
  }

  const avatarUrl = draft.avatarUrl.trim();
  if (avatarUrl !== saved.avatarUrl.trim()) {
    patch.avatarUrl = avatarUrl === "" ? null : avatarUrl;
  }

  const coverUrl = draft.coverUrl.trim();
  if (coverUrl !== saved.coverUrl.trim()) {
    patch.coverUrl = coverUrl === "" ? null : coverUrl;
  }

  if (draft.visibility !== saved.visibility) {
    patch.visibility = draft.visibility;
  }
  if (!sameSet(draft.interests, saved.interests)) {
    patch.interests = draft.interests;
  }
  if (!sameSet(draft.goals, saved.goals)) {
    patch.goals = draft.goals;
  }

  return patch;
}

interface BasicsFormProps {
  profile: OwnerProfile;
}

export function BasicsForm({ profile }: BasicsFormProps): ReactElement {
  const updateMutation = useUpdateProfile();

  // "saved" = what the server last confirmed. "values" = the draft being typed.
  const [saved, setSaved] = useState<BasicsValues>(() => toValues(profile));
  const [values, setValues] = useState<BasicsValues>(() => toValues(profile));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState<boolean>(false);

  const patch = buildPatch(saved, values);
  const isDirty = Object.keys(patch).length > 0;

  useUnsavedChangesWarning(isDirty);

  function change(next: Partial<BasicsValues>): void {
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
    // Throw the draft away and go back to the saved values.
    setValues(saved);
    setErrors({});
    setFormError(null);
    setJustSaved(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setFormError(null);

    // 1. Quick checks in the browser.
    const result = basicsFormSchema.safeParse(values);
    if (!result.success) {
      const fieldErrors = toFieldErrors(result.error);
      setErrors(fieldErrors);
      focusFirstInvalidField(fieldErrors, FIELD_ORDER, "basics");
      return;
    }

    if (!isDirty) {
      return;
    }

    // 2. Send only what changed. The draft stays as typed if this fails.
    updateMutation.mutate(patch, {
      onSuccess: (savedProfile) => {
        const next = toValues(savedProfile);
        setSaved(next);
        setValues(next);
        setErrors({});
        setJustSaved(true);
      },
      onError: (error: unknown) => {
        const info = getApiErrorInfo(error);
        const topLevel = toTopLevelErrors(info.fieldErrors);

        setErrors(topLevel);
        setFormError(info.message);
        focusFirstInvalidField(topLevel, FIELD_ORDER, "basics");
      },
    });
  }

  const visibilityHint =
    visibilityOptions.find((option) => option.value === values.visibility)
      ?.hint ?? "";

  return (
    <ProfileSection
      title="Basics"
      description="What people see first on your profile."
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {formError ? (
          <ErrorMessage
            title="Could not save your changes"
            message={formError}
          />
        ) : null}

        <Input
          id="basics-displayName"
          label="Name or business name"
          autoComplete="name"
          required
          value={values.displayName}
          onChange={(event) => change({ displayName: event.target.value })}
          error={errors.displayName}
        />

        <Input
          id="basics-headline"
          label="Headline"
          hint="For example: Product designer, or Marketing agency for startups."
          value={values.headline}
          onChange={(event) => change({ headline: event.target.value })}
          error={errors.headline}
        />

        <Input
          id="basics-location"
          label="Location"
          hint="A city or country, or Remote."
          autoComplete="address-level2"
          value={values.location}
          onChange={(event) => change({ location: event.target.value })}
          error={errors.location}
        />

        <Textarea
          id="basics-bio"
          label="About you"
          rows={6}
          hint={`${values.bio.length} of 2000 characters. Blank lines are kept.`}
          value={values.bio}
          onChange={(event) => change({ bio: event.target.value })}
          error={errors.bio}
        />

        <Input
          id="basics-avatarUrl"
          label="Photo link (optional)"
          type="url"
          inputMode="url"
          autoComplete="off"
          hint="Uploads are not available yet. Paste a link starting with https:// to an image you are allowed to use. Anyone viewing your profile will load the image from that website."
          value={values.avatarUrl}
          onChange={(event) => change({ avatarUrl: event.target.value })}
          error={errors.avatarUrl}
        />

        <Input
          id="basics-coverUrl"
          label="Cover image link (optional)"
          type="url"
          inputMode="url"
          autoComplete="off"
          hint="A wide image for the top of your profile. It must start with https://"
          value={values.coverUrl}
          onChange={(event) => change({ coverUrl: event.target.value })}
          error={errors.coverUrl}
        />

        <Select
          id="basics-visibility"
          label="Who can see your profile"
          hint={visibilityHint}
          value={values.visibility}
          onChange={(event) => {
            const next = event.target.value;
            if (isProfileVisibility(next)) {
              change({ visibility: next });
            }
          }}
          error={errors.visibility}
        >
          {visibilityOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>

        <ChoiceGroup
          id="basics-interests"
          legend="Interests"
          hint={`Choose up to ${MAX_INTERESTS}.`}
          options={interestOptions}
          selected={values.interests}
          maxSelected={MAX_INTERESTS}
          onChange={(next) => change({ interests: next })}
          error={errors.interests}
        />

        <ChoiceGroup
          id="basics-goals"
          legend="Your goals"
          hint="Only you can see this. We use it to personalize SkillBridge."
          required
          options={goalOptions}
          selected={values.goals}
          onChange={(next) => change({ goals: next })}
          error={errors.goals}
        />

        <SaveBar
          isDirty={isDirty}
          isSaving={updateMutation.isPending}
          justSaved={justSaved}
          onCancel={handleCancel}
        />
      </form>
    </ProfileSection>
  );
}
