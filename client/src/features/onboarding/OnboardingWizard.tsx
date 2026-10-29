import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactElement } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { ZodType } from "zod";
import { Button, Card, ErrorMessage } from "../../components/ui";
import { getApiErrorInfo } from "../../lib/apiError";
import { focusFirstInvalidField } from "../../lib/forms";
import { toFieldErrors } from "../../lib/zodErrors";
import type { OnboardingInput } from "../../types/onboarding";
import { authKeys } from "../auth/authQueries";
import { AboutYouStep } from "./AboutYouStep";
import { AccountTypeStep } from "./AccountTypeStep";
import { useCompleteOnboarding } from "./onboardingQueries";
import {
  aboutYouSchema,
  accountTypeSchema,
  preferencesSchema,
} from "./onboardingSchemas";
import { SkillsGoalsStep } from "./SkillsGoalsStep";
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

  function goBack(): void {
    setFormError(null);
    setStep((previous) => Math.max(0, previous - 1));
  }

  function submitToServer(): void {
    completeMutation.mutate(values, {
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
    const result = currentStep.schema.safeParse(values);

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

    submitToServer();
  }

  const isSaving = completeMutation.isPending;

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

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            {step > 0 ? (
              <Button variant="secondary" onClick={goBack} disabled={isSaving}>
                Back
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" loading={isSaving}>
              {isLastStep ? (isSaving ? "Saving..." : "Finish") : "Next"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
