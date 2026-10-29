import type { ReactElement } from "react";
import { ChoiceGroup } from "../../components/forms/ChoiceGroup";
import {
  MAX_INTERESTS,
  MAX_SKILLS,
  goalOptions,
  interestOptions,
  suggestedSkills,
} from "./onboardingOptions";
import { SkillsInput } from "./SkillsInput";
import type { StepProps } from "./stepTypes";

export function SkillsGoalsStep({
  values,
  errors,
  onChange,
}: StepProps): ReactElement {
  return (
    <div className="space-y-8">
      <SkillsInput
        id="onboarding-skills"
        skills={values.skills}
        suggestions={suggestedSkills}
        max={MAX_SKILLS}
        error={errors.skills}
        onChange={(next) => onChange({ skills: next })}
      />

      <ChoiceGroup
        id="onboarding-interests"
        legend="Interests (optional)"
        hint={`Choose up to ${MAX_INTERESTS} topics you care about.`}
        options={interestOptions}
        selected={values.interests}
        maxSelected={MAX_INTERESTS}
        onChange={(next) => onChange({ interests: next })}
        error={errors.interests}
      />

      <ChoiceGroup
        id="onboarding-goals"
        legend="What do you want from SkillBridge?"
        hint="We use your answers to personalize SkillBridge as new features arrive."
        required
        options={goalOptions}
        selected={values.goals}
        onChange={(next) => onChange({ goals: next })}
        error={errors.goals}
      />
    </div>
  );
}
