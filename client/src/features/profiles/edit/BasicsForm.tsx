import { useState } from "react";
import type { ChangeEvent, FormEvent, ReactElement } from "react";
import { ChoiceGroup } from "../../../components/forms/ChoiceGroup";
import { ErrorMessage, Input, Select, Textarea } from "../../../components/ui";
import { useUnsavedChangesWarning } from "../../../hooks/useUnsavedChangesWarning";
import { getApiErrorInfo } from "../../../lib/apiError";
import { toTopLevelErrors } from "../../../lib/fieldErrors";
import { focusFirstInvalidField } from "../../../lib/forms";
import { toFieldErrors } from "../../../lib/zodErrors";
import type { OwnerProfile, ProfileVisibility } from "../../../types/profile";
import type { ProfilePatch } from "../../../types/profileEdit";
import { uploadProfileImage } from "../../../services/profileService";
import type { ProfileImageType } from "../../../services/profileService";
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

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

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

  const [saved, setSaved] = useState<BasicsValues>(() => toValues(profile));
  const [values, setValues] = useState<BasicsValues>(() => toValues(profile));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState<boolean>(false);

  const [uploading, setUploading] = useState<Record<ProfileImageType, boolean>>(
    {
      avatar: false,
      cover: false,
    },
  );

  const [uploadErrors, setUploadErrors] = useState<
    Record<ProfileImageType, string | null>
  >({
    avatar: null,
    cover: null,
  });

  // Remember the filename after the browser file input is reset.
  const [selectedFileNames, setSelectedFileNames] = useState<
    Record<ProfileImageType, string>
  >({
    avatar: "",
    cover: "",
  });

  const patch = buildPatch(saved, values);
  const isDirty = Object.keys(patch).length > 0;
  const isUploading = uploading.avatar || uploading.cover;

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

  async function handleImageUpload(
    event: ChangeEvent<HTMLInputElement>,
    imageType: ProfileImageType,
  ): Promise<void> {
    const input = event.currentTarget;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    // Reset the native input but keep the filename in React state.
    input.value = "";

    setUploadErrors((previous) => ({
      ...previous,
      [imageType]: null,
    }));

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setSelectedFileNames((previous) => ({
        ...previous,
        [imageType]: "",
      }));

      setUploadErrors((previous) => ({
        ...previous,
        [imageType]: "Choose a JPEG, PNG, or WebP image.",
      }));
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setSelectedFileNames((previous) => ({
        ...previous,
        [imageType]: "",
      }));

      setUploadErrors((previous) => ({
        ...previous,
        [imageType]: "The image must not exceed 5 MB.",
      }));
      return;
    }

    setSelectedFileNames((previous) => ({
      ...previous,
      [imageType]: file.name,
    }));

    setUploading((previous) => ({
      ...previous,
      [imageType]: true,
    }));

    try {
      const result = await uploadProfileImage(imageType, file);

      if (imageType === "avatar") {
        change({ avatarUrl: result.imageUrl });
      } else {
        change({ coverUrl: result.imageUrl });
      }
    } catch (error: unknown) {
      const info = getApiErrorInfo(error);

      setUploadErrors((previous) => ({
        ...previous,
        [imageType]: info.message,
      }));
    } finally {
      setUploading((previous) => ({
        ...previous,
        [imageType]: false,
      }));
    }
  }

  function removeImage(imageType: ProfileImageType): void {
    if (imageType === "avatar") {
      change({ avatarUrl: "" });
    } else {
      change({ coverUrl: "" });
    }

    setSelectedFileNames((previous) => ({
      ...previous,
      [imageType]: "",
    }));

    setUploadErrors((previous) => ({
      ...previous,
      [imageType]: null,
    }));
  }

  function handleCancel(): void {
    setValues(saved);
    setErrors({});
    setFormError(null);
    setJustSaved(false);

    setUploadErrors({
      avatar: null,
      cover: null,
    });

    setSelectedFileNames({
      avatar: "",
      cover: "",
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setFormError(null);

    const result = basicsFormSchema.safeParse(values);

    if (!result.success) {
      const fieldErrors = toFieldErrors(result.error);
      setErrors(fieldErrors);
      focusFirstInvalidField(fieldErrors, FIELD_ORDER, "basics");
      return;
    }

    if (!isDirty || isUploading) {
      return;
    }

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

  function renderImageStatus(imageType: ProfileImageType): ReactElement {
    const fileName = selectedFileNames[imageType];
    const isCurrentlyUploading = uploading[imageType];
    const hasImage =
      imageType === "avatar"
        ? Boolean(values.avatarUrl)
        : Boolean(values.coverUrl);

    if (isCurrentlyUploading) {
      return (
        <p className="mt-2 flex items-center gap-2 text-sm text-blue-600">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          Uploading your image...
        </p>
      );
    }

    if (uploadErrors[imageType]) {
      return (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {uploadErrors[imageType]}
        </p>
      );
    }

    if (fileName && hasImage) {
      return (
        <div className="mt-2 space-y-1">
          <p className="flex items-center gap-2 text-sm font-medium text-green-700">
            <span aria-hidden="true">✓</span>
            Uploaded to Cloudinary
          </p>
          <p className="break-all text-xs text-gray-500">{fileName}</p>
          <p className="text-xs text-gray-500">
            Click Save changes below to update your profile.
          </p>
        </div>
      );
    }

    if (hasImage) {
      return (
        <p className="mt-2 text-sm text-green-700">
          ✓ Current image is saved to your profile.
        </p>
      );
    }

    return (
      <p className="mt-2 text-sm text-gray-500">
        No image added yet. Choose an image from your device.
      </p>
    );
  }

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

        {/* Profile photo upload */}
        <div className="space-y-3">
          <div>
            <label
              htmlFor="basics-avatarUpload"
              className="mb-1 block text-sm font-medium"
            >
              Profile photo
            </label>

            <p className="mb-3 text-sm text-gray-500">
              Choose a JPEG, PNG, or WebP image. Maximum size: 5 MB.
            </p>

            {values.avatarUrl ? (
              <div className="mb-3 flex items-center gap-4">
                <img
                  src={values.avatarUrl}
                  alt="Profile photo preview"
                  className="h-20 w-20 rounded-full border object-cover"
                />

                <button
                  type="button"
                  onClick={() => removeImage("avatar")}
                  disabled={uploading.avatar}
                  className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                >
                  Remove photo
                </button>
              </div>
            ) : null}

            <input
              id="basics-avatarUpload"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {
                void handleImageUpload(event, "avatar");
              }}
              disabled={uploading.avatar}
              className="peer sr-only"
            />

            <label
              htmlFor="basics-avatarUpload"
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-blue-600"
            >
              <span aria-hidden="true">↑</span>
              {values.avatarUrl ? "Choose another photo" : "Choose photo"}
            </label>

            {renderImageStatus("avatar")}
          </div>
        </div>

        {/* Cover image upload */}
        <div className="space-y-3">
          <div>
            <label
              htmlFor="basics-coverUpload"
              className="mb-1 block text-sm font-medium"
            >
              Cover image
            </label>

            <p className="mb-3 text-sm text-gray-500">
              Choose a wide JPEG, PNG, or WebP image. Maximum size: 5 MB.
            </p>

            {values.coverUrl ? (
              <div className="mb-3 space-y-3">
                <img
                  src={values.coverUrl}
                  alt="Cover image preview"
                  className="h-32 w-full rounded-lg border object-cover"
                />

                <button
                  type="button"
                  onClick={() => removeImage("cover")}
                  disabled={uploading.cover}
                  className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                >
                  Remove cover image
                </button>
              </div>
            ) : null}

            <input
              id="basics-coverUpload"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {
                void handleImageUpload(event, "cover");
              }}
              disabled={uploading.cover}
              className="peer sr-only"
            />

            <label
              htmlFor="basics-coverUpload"
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-blue-600"
            >
              <span aria-hidden="true">↑</span>
              {values.coverUrl ? "Choose another cover" : "Choose cover image"}
            </label>

            {renderImageStatus("cover")}
          </div>
        </div>

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
          isSaving={updateMutation.isPending || isUploading}
          justSaved={justSaved}
          onCancel={handleCancel}
        />
      </form>
    </ProfileSection>
  );
}
