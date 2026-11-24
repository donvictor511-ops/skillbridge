import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactElement } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { ZodType } from "zod";
import { Button, Card, ErrorMessage } from "../../components/ui";
import { getApiErrorInfo } from "../../lib/apiError";
import { focusFirstInvalidField } from "../../lib/forms";
import { toFieldErrors } from "../../lib/zodErrors";
import { uploadProfileImage } from "../../services/profileService";
import type { OnboardingInput } from "../../types/onboarding";
import { authKeys } from "../auth/authQueries";
import { AboutYouStep } from "./AboutYouStep";
import { AccountTypeStep } from "./AccountTypeStep";
import { useCompleteOnboarding } from "./onboardingQueries";
import {
  aboutYouSchema,
  accountTypeSchema,
  preferencesSchema,
  showcaseSchema,
} from "./onboardingSchemas";
import type { ShowcaseDraft } from "./onboardingSchemas";
import { SkillsGoalsStep } from "./SkillsGoalsStep";
import { ShowcaseStep } from "./ShowcaseStep";
import { StepIndicator } from "./StepIndicator";

interface StepConfig {
  title: string;
  description: string;
  schema: ZodType;
  // Field names on this step, in the order they appear (for focus).
  fields: readonly string[];
}

const STEPS: readonly StepConfig[] = [
  {
    title: "Account type",
    description: "Tell us how you plan to use SkillBridge.",
    schema: accountTypeSchema,
    fields: ["capabilities"],
  },
  {
    title: "About you",
    description: "The basics people will see first.",
    schema: aboutYouSchema,
    fields: ["displayName", "headline", "location"],
  },
  {
    title: "Skills and goals",
    description: "Show what you can do and what you want from SkillBridge.",
    schema: preferencesSchema,
    fields: ["skills", "interests", "goals"],
  },
  {
    title: "Showcase your work",
    description: "Add a profile photo and project so people can see what you do.",
    schema: showcaseSchema,
    fields: ["projectTitle", "projectDescription", "projectUrl", "projectSkills"],
  },
];

const LAST_STEP = STEPS.length - 1;

const initialValues: OnboardingInput = {
  capabilities: [],
  displayName: "",
  headline: "",
  location: "",
  skills: [],
  interests: [],
  goals: [],
};

const initialShowcaseDraft: ShowcaseDraft = {
  projectTitle: "",
  projectDescription: "",
  projectUrl: "",
  projectSkills: [],
};

// The server reports array problems like "skills.2". We only need "skills".
function toTopLevelErrors(
  fieldErrors: Record<string, string>,
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [field, message] of Object.entries(fieldErrors)) {
    const key = field.split(".")[0] ?? field;
    if (!(key in result)) {
      result[key] = message;
    }
  }

  return result;
}

export function OnboardingWizard(): ReactElement {
  const queryClient = useQueryClient();
  const completeMutation = useCompleteOnboarding();

  const [step, setStep] = useState<number>(0);
  const [values, setValues] = useState<OnboardingInput>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [showcaseDraft, setShowcaseDraft] = useState<ShowcaseDraft>(initialShowcaseDraft);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // When the step changes, move focus to its heading so screen reader and
  // keyboard users know where they are.
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  const currentStep = STEPS[step] ?? STEPS[0];
  const isLastStep = step === LAST_STEP;

  // Change some values, and remove the errors of the fields just edited.
  function updateValues(patch: Partial<OnboardingInput>): void {
    setValues((previous) => ({ ...previous, ...patch }));
    setErrors((previous) => {
      const next = { ...previous };
      for (const key of Object.keys(patch)) {
        delete next[key];
      }
      return next;
    });
  }

  function updateShowcaseDraft(patch: Partial<ShowcaseDraft>): void {
    setShowcaseDraft((previous) => ({ ...previous, ...patch }));
    setErrors((previous) => {
      const next = { ...previous };
      for (const key of Object.keys(patch)) delete next[key];
      return next;
    });
  }

  function selectAvatar(file: File | null): void {
    setPhotoError(null);
    if (file && !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setAvatarFile(null);
      setPhotoError("Choose a JPEG, PNG, or WebP photo.");
      return;
    }
    if (file && file.size > 5 * 1024 * 1024) {
      setAvatarFile(null);
      setPhotoError("Your photo must be 5 MB or smaller.");
      return;
    }
    setAvatarFile(file);
  }

  function goBack(): void {
    setFormError(null);
    setStep((previous) => Math.max(0, previous - 1));
  }

  async function submitToServer(includeShowcase = true): Promise<void> {
    setFormError(null);
    let avatarUrl: string | undefined;
    // The photo and project are separate optional choices. Skipping the
    // project must not discard a photo the person already selected.
    if (avatarFile) {
      setIsUploadingPhoto(true);
      try {
        avatarUrl = (await uploadProfileImage("avatar", avatarFile)).imageUrl;
      } catch (error: unknown) {
        setPhotoError(getApiErrorInfo(error).message);
        setIsUploadingPhoto(false);
        return;
      }
      setIsUploadingPhoto(false);
    }

    const hasProject = includeShowcase && Boolean(showcaseDraft.projectTitle.trim() && showcaseDraft.projectDescription.trim());
    const input: OnboardingInput = {
      ...values,
      ...(avatarUrl ? { avatarUrl } : {}),
      ...(hasProject ? {
        project: {
          title: showcaseDraft.projectTitle.trim(),
          description: showcaseDraft.projectDescription.trim(),
          projectUrl: showcaseDraft.projectUrl.trim() || null,
          skills: showcaseDraft.projectSkills,
        },
      } : {}),
    };

    completeMutation.mutate(input, {
      onError: (error: unknown) => {
        const info = getApiErrorInfo(error);
        const topLevel = toTopLevelErrors(info.fieldErrors);

        setErrors(topLevel);
        setFormError(info.message);

        // Jump to the first step that owns a field with a server error.
        const errorStep = STEPS.findIndex((candidate) =>
          candidate.fields.some((field) => field in topLevel),
        );
        if (errorStep >= 0) {
          setStep(errorStep);
        }

        // Another tab may already have finished onboarding. Refresh the user:
        // OnboardingPage then sends this person to the dashboard.
        if (info.code === "ONBOARDING_ALREADY_COMPLETED") {
          void queryClient.invalidateQueries({ queryKey: authKeys.me });
        }
      },
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setFormError(null);

    // Quick checks for THIS step only.
    const result = step === LAST_STEP
      ? showcaseSchema.safeParse(showcaseDraft)
      : currentStep.schema.safeParse(values);

    if (!result.success) {
      const stepErrors = toFieldErrors(result.error);
      setErrors(stepErrors);
      focusFirstInvalidField(stepErrors, currentStep.fields, "onboarding");
      return;
    }

    setErrors({});

    if (!isLastStep) {
      setStep(step + 1);
      return;
    }

    void submitToServer();
  }

  const isSaving = completeMutation.isPending || isUploadingPhoto;

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy sm:text-3xl">
        Set up your profile
      </h1>
      <p className="mt-2 text-muted">
        A few quick questions so SkillBridge fits you. It takes about two
        minutes.
      </p>

      <Card padding="lg" className="mt-6">
        <StepIndicator current={step} total={STEPS.length} />

        <h2
          ref={headingRef}
          tabIndex={-1}
          className="mt-5 text-xl font-semibold text-navy"
        >
          {currentStep.title}
        </h2>
        <p className="mt-1 text-sm text-muted">{currentStep.description}</p>

        <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-6">
          {formError ? (
            <ErrorMessage
              title="Could not save your profile"
              message={formError}
            />
          ) : null}

          {step === 0 ? (
            <AccountTypeStep
              values={values}
              errors={errors}
              onChange={updateValues}
            />
          ) : null}
          {step === 1 ? (
            <AboutYouStep
              values={values}
              errors={errors}
              onChange={updateValues}
            />
          ) : null}
          {step === 2 ? (
            <SkillsGoalsStep
              values={values}
              errors={errors}
              onChange={updateValues}
            />
          ) : null}
          {step === 3 ? (
            <ShowcaseStep
              values={values}
              draft={showcaseDraft}
              avatarFile={avatarFile}
              errors={errors}
              photoError={photoError}
              onDraftChange={updateShowcaseDraft}
              onPhotoSelect={selectAvatar}
            />
          ) : null}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            {step > 0 ? (
              <Button variant="secondary" onClick={goBack} disabled={isSaving}>
                Back
              </Button>
            ) : (
              <span />
            )}
            {isLastStep ? (
              <Button variant="secondary" disabled={isSaving} onClick={() => void submitToServer(false)}>
                Skip project for now
              </Button>
            ) : null}
            <Button type="submit" loading={isSaving}>
              {isLastStep ? (isUploadingPhoto ? "Uploading photo..." : isSaving ? "Saving..." : "Finish setup") : "Next"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
